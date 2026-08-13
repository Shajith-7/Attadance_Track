const express = require('express');
const router = express.Router();
const WorkSession = require('../models/WorkSession');
const WorkSessionEvent = require('../models/WorkSessionEvent');
const Attendance = require('../models/Attendance');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { createAuditLog } = require('../services/auditService');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');

// Helper to record event
const recordEvent = async (sessionId, employeeId, eventType, metadata = {}) => {
    await WorkSessionEvent.create({ sessionId, employeeId, eventType, metadata });
};

// Helper to apply time elapsed since lastStateChangeAt
const applyTime = (session, now) => {
    let effectiveEndTime = now;
    const timeSinceHeartbeat = Math.floor((now.getTime() - session.lastHeartbeatAt.getTime()) / 1000);
    
    // If no heartbeat for > 2 minutes (120s), consider the browser closed/disconnected.
    // Cap the active time accumulation at the last known heartbeat.
    if (timeSinceHeartbeat > 120 && !['PAUSED', 'COMPLETED', 'FORCE_ENDED'].includes(session.status)) {
        // Ensure effectiveEndTime doesn't go backwards before lastStateChangeAt
        effectiveEndTime = new Date(Math.max(session.lastHeartbeatAt.getTime(), session.lastStateChangeAt.getTime()));
    }

    const elapsedSeconds = Math.floor((effectiveEndTime.getTime() - session.lastStateChangeAt.getTime()) / 1000);
    
    if (elapsedSeconds > 0) {
        if (session.status === 'ACTIVE') {
            session.activeSeconds += elapsedSeconds;
        } else if (session.status === 'ON_BREAK') {
            session.breakSeconds += elapsedSeconds;
        } else if (session.status === 'AWAY_WARNING') {
            session.awaySeconds += elapsedSeconds;
        }
    }

    // Force pause if disconnected
    if (timeSinceHeartbeat > 120 && !['PAUSED', 'ON_BREAK', 'COMPLETED', 'FORCE_ENDED'].includes(session.status)) {
        session.status = 'PAUSED';
        session.hiddenAt = null;
    }

    session.lastStateChangeAt = now;
};

// POST /start
router.post('/start', authenticate, async (req, res) => {
    try {
        const { shiftDate, consentGiven, consentVersion, shiftId } = req.body;
        
        if (!consentGiven) {
            return res.status(400).json({ error: 'Consent is required to start a work session.' });
        }
        
        const employee = await Employee.findById(req.user.employeeId);
        
        if (!employee || employee.Status !== 'Active') {
            return res.status(403).json({ error: 'Account is not active.' });
        }
        
        // Check for existing session today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const existingSession = await WorkSession.findOne({ 
            employeeId: req.user.employeeId, 
            startedAt: { $gte: todayStart }
        });

        if (existingSession) {
            return res.status(400).json({ error: 'You have already completed or have an active work session today.' });
        }

        const now = new Date();
        const newSession = new WorkSession({
            employeeId: req.user.employeeId,
            shiftDate,
            shiftId,
            startedAt: now,
            status: 'ACTIVE',
            consentGiven,
            consentAt: now,
            consentVersion,
            lastStateChangeAt: now,
            lastTabVisibleAt: now,
            lastHeartbeatAt: now,
            screenShareConnected: true
        });

        await newSession.save();
        await recordEvent(newSession._id, req.user.employeeId, 'SESSION_STARTED', { consentVersion });

        // Sync with Attendance model for Dashboard compatibility
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        try {
            await Attendance.findOneAndUpdate(
                { EmployeeID: req.user.employeeId, AttendanceDate: today },
                { 
                    ClockIn: now, 
                    WorkMode: 'WFH',
                    Status: 'Working',
                    IPAddress: req.ip
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        } catch (attErr) {
            console.error('Failed to sync Attendance start:', attErr);
        }

        createAuditLog(req, {
            action: 'WORK_SESSION_STARTED',
            details: { sessionId: newSession._id, shiftDate }
        });

        res.status(201).json(newSession);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error starting work session' });
    }
});

// POST /:id/events
router.post('/:id/events', authenticate, async (req, res) => {
    try {
        const { type, metadata } = req.body;
        const sessionId = req.params.id;
        const employeeId = req.user.employeeId;

        const session = await WorkSession.findOne({ _id: sessionId, employeeId });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (['COMPLETED', 'FORCE_ENDED'].includes(session.status)) {
            return res.status(400).json({ error: 'Session is already ended' });
        }

        const now = new Date();
        
        // Always apply time based on previous status before changing state
        applyTime(session, now);

        // Process the event
        switch (type) {
            case 'TAB_HIDDEN':
                if (session.status === 'ACTIVE') {
                    session.status = 'AWAY_WARNING';
                    session.hiddenAt = now;
                }
                break;
            case 'TAB_VISIBLE':
                session.lastTabVisibleAt = now;
                if (session.status === 'AWAY_WARNING') {
                    session.status = 'ACTIVE';
                    session.hiddenAt = null;
                }
                break;
            case 'BREAK_STARTED':
                if (session.status === 'ACTIVE' || session.status === 'AWAY_WARNING') {
                    session.status = 'ON_BREAK';
                    session.breakStartedAt = now;
                    session.hiddenAt = null;
                }
                break;
            case 'BREAK_ENDED':
                if (session.status === 'ON_BREAK') {
                    session.status = 'ACTIVE';
                    session.breakStartedAt = null;
                }
                break;
            case 'SESSION_RESUMED':
                if (session.status === 'PAUSED') {
                    session.status = 'ACTIVE';
                    session.hiddenAt = null;
                }
                break;
            case 'SCREEN_SHARE_STARTED':
                session.screenShareConnected = true;
                break;
            case 'SCREEN_SHARE_ENDED':
                session.screenShareConnected = false;
                break;
            case 'SESSION_ENDED':
                session.status = 'COMPLETED';
                session.endedAt = now;
                
                // Sync with Attendance
                try {
                    const sessionDate = new Date(session.startedAt);
                    sessionDate.setHours(0, 0, 0, 0);
                    const totalHours = session.activeSeconds > 0 ? (session.activeSeconds / 3600) : 0;
                    
                    await Attendance.findOneAndUpdate(
                        { EmployeeID: employeeId, AttendanceDate: sessionDate },
                        { 
                            ClockOut: now, 
                            TotalHours: totalHours,
                            Status: 'Present'
                        }
                    );
                } catch (attErr) {
                    console.error('Failed to sync Attendance end:', attErr);
                }
                break;
            case 'HEARTBEAT':
                session.lastHeartbeatAt = now;
                // Check if we've been AWAY_WARNING for >= 10 mins (600 seconds)
                if (session.status === 'AWAY_WARNING' && session.hiddenAt) {
                    const awaySeconds = Math.floor((now.getTime() - session.hiddenAt.getTime()) / 1000);
                    if (awaySeconds >= 600) {
                        session.status = 'PAUSED';
                        // Record event for auto-pause
                        await recordEvent(session._id, employeeId, 'SESSION_PAUSED', { reason: '10_MIN_INACTIVITY' });
                        createAuditLog(req, {
                            action: 'WORK_SESSION_PAUSED',
                            details: { sessionId: session._id, reason: '10_MIN_INACTIVITY' }
                        });
                    }
                }
                break;
            default:
                return res.status(400).json({ error: 'Unknown event type' });
        }

        await session.save();
        await recordEvent(session._id, employeeId, type, metadata);

        // Optional specific audit logs
        if (['BREAK_STARTED', 'BREAK_ENDED', 'SCREEN_SHARE_STARTED', 'SCREEN_SHARE_ENDED', 'SESSION_RESUMED', 'SESSION_ENDED'].includes(type)) {
            createAuditLog(req, {
                action: 'WORK_SESSION_' + type.replace('_STARTED', '_STARTED').replace('_ENDED', '_ENDED'),
                details: { sessionId: session._id }
            });
        }

        res.json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error processing event' });
    }
});

// GET /my/today
router.get('/my/today', authenticate, async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const session = await WorkSession.findOne({ 
            employeeId: req.user.employeeId,
            startedAt: { $gte: todayStart }
        }).sort({ startedAt: -1 });

        if (!session) {
            return res.json(null);
        }

        if (session.status === 'COMPLETED') {
            return res.json(session.toObject());
        }

        // Catch up time for UI sync or auto-pause if disconnected
        const now = new Date();
        const timeSinceHeartbeat = Math.floor((now.getTime() - session.lastHeartbeatAt.getTime()) / 1000);
        let saveNeeded = false;

        if (timeSinceHeartbeat > 120 && !['PAUSED', 'ON_BREAK'].includes(session.status)) {
            // Apply time properly and pause the session permanently in the DB
            applyTime(session, now);
            await session.save();
            await recordEvent(session._id, req.user.employeeId, 'SESSION_PAUSED', { reason: 'CONNECTION_LOST' });
            return res.json(session.toObject());
        }

        const uiSession = session.toObject();
        const elapsed = Math.floor((now.getTime() - session.lastStateChangeAt.getTime()) / 1000);
        
        if (elapsed > 0) {
            if (uiSession.status === 'ACTIVE') uiSession.activeSeconds += elapsed;
            if (uiSession.status === 'ON_BREAK') uiSession.breakSeconds += elapsed;
            if (uiSession.status === 'AWAY_WARNING') uiSession.awaySeconds += elapsed;
        }
        
        // Also check if it should be paused right now for UI purposes due to away warning
        if (uiSession.status === 'AWAY_WARNING' && uiSession.hiddenAt) {
            const awayElapsed = Math.floor((now.getTime() - new Date(uiSession.hiddenAt).getTime()) / 1000);
            if (awayElapsed >= 600) {
                uiSession.status = 'PAUSED';
            }
        }

        res.json(uiSession);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching session' });
    }
});

// GET /my/history
router.get('/my/history', authenticate, async (req, res) => {
    try {
        const sessions = await WorkSession.find({ employeeId: req.user.employeeId }).sort({ startedAt: -1 }).limit(30);
        res.json(sessions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching history' });
    }
});

// ADMIN ROUTES
// GET /admin/live
router.get('/admin/live', authenticate, async (req, res) => {
    try {
        // We will allow HR and ADMIN roles. The prompt said ONLY TWO ROLES (ADMIN, EMPLOYEE).
        if (req.user.role !== 'Admin' && req.user.role !== 'HR') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const sessions = await WorkSession.find({
            status: { $in: ['ACTIVE', 'ON_BREAK', 'AWAY_WARNING', 'PAUSED'] }
        }).populate('employeeId', 'FirstName LastName Email Status');
        
        res.json(sessions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching live sessions' });
    }
});

module.exports = router;
