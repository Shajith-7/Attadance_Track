const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { authenticate } = require('../middleware/authenticate');
const { createAuditLog } = require('../services/auditService');

// GET /api/attendance/today
// Fetch today's attendance record for the logged-in user
router.get('/today', authenticate, async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

        const record = await Attendance.findOne({
            EmployeeID: req.user.employeeId,
            AttendanceDate: { $gte: today }
        });

        if (!record) {
            return res.json({ clockedIn: false, record: null });
        }

        res.json({
            clockedIn: true,
            clockedOut: !!record.ClockOut,
            record
        });
    } catch (error) {
        console.error('Error fetching today attendance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/attendance/clock-in
// Clock in the user
router.post('/clock-in', authenticate, async (req, res) => {
    try {
        const { location, status } = req.body;
        const requestedMode = status || 'WFO';
        
        // Fetch employee policy
        const employee = await Employee.findById(req.user.employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (employee.Status !== 'Active') {
            return res.status(403).json({ error: 'Account is not active.' });
        }

        if (employee.AssignedShift !== 'NIGHT') {
            return res.status(400).json({ error: 'Attendance tracking is only required for Night Shift employees.' });
        }
        
        // Since the app is only used for WFH Night Shift attendance now
        const actualMode = 'WFH';

        const now = new Date();
        const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

        // Check if already clocked in today
        const existingRecord = await Attendance.findOne({
            EmployeeID: req.user.employeeId,
            AttendanceDate: { $gte: today }
        });

        if (existingRecord) {
            return res.status(400).json({ error: 'Already clocked in today' });
        }

        const newRecord = await Attendance.create({
            EmployeeID: req.user.employeeId,
            AttendanceDate: today,
            ClockIn: new Date(), // Server time
            WorkMode: actualMode,
            Status: 'Working',
            IPAddress: req.ip
        });

        await createAuditLog(req, {
            action: 'ATTENDANCE_CLOCK_IN',
            targetEmployee: req.user.employeeId,
            changes: [
                { field: 'Status', newValue: 'Working' },
                { field: 'WorkMode', newValue: actualMode }
            ]
        });

        res.status(201).json({ message: 'Clocked in successfully', record: newRecord });
    } catch (error) {
        console.error('Error clocking in:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/attendance/clock-out
// Clock out the user
router.post('/clock-out', authenticate, async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

        const record = await Attendance.findOne({
            EmployeeID: req.user.employeeId,
            AttendanceDate: { $gte: today }
        });

        if (!record) {
            return res.status(400).json({ error: 'No active clock-in record found for today' });
        }

        if (record.ClockOut) {
            return res.status(400).json({ error: 'Already clocked out today' });
        }

        record.ClockOut = new Date(); // Server time
        
        // Calculate total hours
        const diffMs = record.ClockOut - record.ClockIn;
        const diffHrs = diffMs / (1000 * 60 * 60);
        const oldStatus = record.Status;
        record.TotalHours = parseFloat(diffHrs.toFixed(2));
        record.Status = 'Present';

        await record.save();

        await createAuditLog(req, {
            action: 'ATTENDANCE_CLOCK_OUT',
            targetEmployee: req.user.employeeId,
            changes: [
                { field: 'Status', oldValue: oldStatus, newValue: 'Present' },
                { field: 'TotalHours', newValue: record.TotalHours }
            ]
        });

        res.json({ message: 'Clocked out successfully', record });
    } catch (error) {
        console.error('Error clocking out:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/attendance/history
// Fetch attendance history for the logged-in user
router.get('/history', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 10, month, status, workMode, startDate, endDate } = req.query;
        
        const query = { EmployeeID: req.user.employeeId };
        
        if (startDate && endDate) {
            query.AttendanceDate = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate + 'T23:59:59.999Z') 
            };
        } else if (month) {
            const [year, m] = month.split('-');
            const start = new Date(year, parseInt(m) - 1, 1);
            const end = new Date(year, parseInt(m), 0, 23, 59, 59, 999);
            query.AttendanceDate = { $gte: start, $lte: end };
        }
        
        if (status && status !== 'All') {
            query.Status = status;
        }
        
        if (workMode && workMode !== 'All') {
            query.WorkMode = workMode;
        }
        
        let records;
        if (limit === 'all') {
            records = await Attendance.find(query).sort({ AttendanceDate: -1 });
        } else {
            const skip = (parseInt(page) - 1) * parseInt(limit);
            records = await Attendance.find(query)
                .sort({ AttendanceDate: -1 })
                .skip(skip)
                .limit(parseInt(limit));
        }
            
        const total = await Attendance.countDocuments(query);
        
        const summaryQuery = { EmployeeID: req.user.employeeId };
        if (query.AttendanceDate) {
            summaryQuery.AttendanceDate = query.AttendanceDate;
        }
        
        const [presentCount, wfhCount, leaveCount] = await Promise.all([
            Attendance.countDocuments({ ...summaryQuery, Status: { $in: ['Present', 'Working'] } }),
            Attendance.countDocuments({ ...summaryQuery, WorkMode: 'WFH' }),
            Attendance.countDocuments({ ...summaryQuery, Status: 'Leave' })
        ]);
        
        res.json({
            records,
            total,
            page: limit === 'all' ? 1 : parseInt(page),
            totalPages: limit === 'all' ? 1 : Math.ceil(total / parseInt(limit)),
            summary: {
                present: presentCount,
                wfh: wfhCount,
                leave: leaveCount
            }
        });
    } catch (error) {
        console.error('Error fetching attendance history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
