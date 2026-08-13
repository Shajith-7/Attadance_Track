const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { createAuditLog } = require('../services/auditService');

// POST /api/leaves/apply (Employee applies for leave)
router.post('/apply', authenticate, async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;
        
        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ error: 'End date cannot be before start date' });
        }

        const newLeave = await Leave.create({
            EmployeeID: req.user.employeeId,
            LeaveType: leaveType,
            StartDate: startDate,
            EndDate: endDate,
            Reason: reason
        });

        await createAuditLog(req, {
            action: 'LEAVE_APPLIED',
            targetEmployee: req.user.employeeId,
            changes: [
                { field: 'LeaveType', newValue: leaveType },
                { field: 'StartDate', newValue: startDate },
                { field: 'EndDate', newValue: endDate }
            ]
        });

        res.status(201).json({ message: 'Leave application submitted successfully', leave: newLeave });
    } catch (error) {
        console.error('Error applying for leave:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/leaves/my-leaves (Employee views own leaves)
router.get('/my-leaves', authenticate, async (req, res) => {
    try {
        const leaves = await Leave.find({ EmployeeID: req.user.employeeId }).sort({ createdAt: -1 });
        res.json(leaves);
    } catch (error) {
        console.error('Error fetching my leaves:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/leaves/all (HR/Manager view all leaves)
router.get('/all', authenticate, authorize('HR', 'Manager', 'CEO', 'Admin', 'Administrator'), async (req, res) => {
    try {
        // Find leaves and populate the Employee details (Name, ID)
        const leaves = await Leave.find({})
            .populate('EmployeeID', 'FirstName LastName EmployeeID Department')
            .sort({ createdAt: -1 });
        res.json(leaves);
    } catch (error) {
        console.error('Error fetching all leaves:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/leaves/:id/status (HR/Manager approves or rejects)
router.put('/:id/status', authenticate, authorize('HR', 'Manager', 'CEO', 'Admin', 'Administrator'), async (req, res) => {
    try {
        const { status } = req.body; // 'Approved' or 'Rejected'
        
        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave request not found' });

        const oldStatus = leave.Status;
        leave.Status = status;
        leave.ReviewedBy = req.user.employeeId;
        await leave.save();

        await createAuditLog(req, {
            action: `LEAVE_${status.toUpperCase()}`,
            targetEmployee: leave.EmployeeID,
            changes: [
                { field: 'Status', oldValue: oldStatus, newValue: status }
            ]
        });

        res.json({ message: `Leave ${status.toLowerCase()} successfully`, leave });
    } catch (error) {
        console.error('Error updating leave status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
