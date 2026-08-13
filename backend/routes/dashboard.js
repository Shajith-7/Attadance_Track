const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Role = require('../models/Role');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

// GET /api/dashboard/ceo
// Fetch aggregated data for CEO Dashboard
router.get('/ceo', authenticate, authorize('CEO', 'HR', 'Admin', 'Administrator'), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Total Employees (Active)
        const totalEmployees = await Employee.countDocuments({ Status: 'Active' });

        // 2. Today's Attendance
        const todaysAttendance = await Attendance.find({
            AttendanceDate: { $gte: today }
        }).populate('EmployeeID', 'FirstName LastName RoleID Status');

        const presentToday = todaysAttendance.length;
        
        // Very basic calculation for Absent (assuming total active employees minus present)
        // In a real app, you'd check schedules and leave requests.
        const absentToday = Math.max(0, totalEmployees - presentToday);
        const onLeave = 0; // Mocked for now until Leave module is built

        const statsData = {
            totalEmployees,
            presentToday,
            absentToday,
            onLeave
        };

        // 3. WFH vs WFO distribution
        let wfhCount = 0;
        let wfoCount = 0;
        todaysAttendance.forEach(att => {
            if (att.WorkMode === 'WFH') wfhCount++;
            else wfoCount++; // Assuming WFO or Hybrid counts as WFO for this metric
        });

        const wfhVsWfoData = [
            { name: 'WFO', value: wfoCount || 0 }, // fallback to 0 instead of empty chart if no data
            { name: 'WFH', value: wfhCount || 0 },
        ];
        
        // If no one is clocked in, provide a default so chart renders beautifully
        if (wfoCount === 0 && wfhCount === 0) {
           wfhVsWfoData[0].value = 1; 
        }

        // 4. Recent Activity (Live Feed)
        // Sort by ClockIn time descending
        const recentActivityRaw = [...todaysAttendance].sort((a, b) => b.ClockIn - a.ClockIn).slice(0, 10);
        
        // Fetch all roles once to map them
        const roles = await Role.find({});
        const roleMap = {};
        roles.forEach(r => roleMap[r.RoleID] = r.RoleName);

        const recentActivity = recentActivityRaw.map(att => {
            const emp = att.EmployeeID;
            if (!emp) return null; // Defensive check
            
            const timeStr = att.ClockIn ? new Date(att.ClockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '---';
            const hoursStr = att.TotalHours ? `${Math.floor(att.TotalHours)}h${Math.round((att.TotalHours % 1) * 60)}m` : '--';
            
            return {
                id: att._id.toString(),
                name: `${emp.FirstName} ${emp.LastName}`,
                role: roleMap[emp.RoleID] || 'Employee',
                status: att.WorkMode,
                time: timeStr,
                location: att.WorkMode === 'WFO' ? 'Office' : 'Remote',
                hours: hoursStr
            };
        }).filter(Boolean); // Remove nulls

        // 5. Weekly Trends (Mocked for now until we have more historical data)
        const weeklyTrendData = [
            { name: 'Mon', present: 0, absent: 0, late: 0 },
            { name: 'Tue', present: 0, absent: 0, late: 0 },
            { name: 'Wed', present: 0, absent: 0, late: 0 },
            { name: 'Thu', present: 0, absent: 0, late: 0 },
            { name: 'Fri', present: totalEmployees, absent: 0, late: 0 }, // Show everyone present today for the demo
        ];

        res.json({
            statsData,
            wfhVsWfoData,
            recentActivity,
            weeklyTrendData
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/dashboard/employee
// Fetch aggregated data for Employee Dashboard
router.get('/employee', authenticate, authorize('Employee', 'CEO', 'HR', 'Manager'), async (req, res) => {
    try {
        const employeeId = req.user.employeeId;
        const now = new Date();
        
        // Get start of current month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Fetch all attendance for this month
        const monthlyAttendance = await Attendance.find({
            EmployeeID: employeeId,
            AttendanceDate: { $gte: startOfMonth }
        });

        let presentDays = 0;
        let wfhDays = 0;
        let leaveDays = 0; // Update when Leave model is added

        monthlyAttendance.forEach(att => {
            if (att.Status === 'Present' || att.Status === 'Working') presentDays++;
            if (att.WorkMode === 'WFH') wfhDays++;
        });

        // Get recent 5 history
        const recentHistory = await Attendance.find({ EmployeeID: employeeId })
            .sort({ AttendanceDate: -1 })
            .limit(5);

        const formattedHistory = recentHistory.map(att => ({
            id: att._id.toString(),
            date: att.AttendanceDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            clockIn: att.ClockIn ? new Date(att.ClockIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--',
            clockOut: att.ClockOut ? new Date(att.ClockOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--',
            hours: att.TotalHours ? `${Math.floor(att.TotalHours)}h${Math.round((att.TotalHours % 1) * 60)}m` : '--',
            status: att.Status
        }));

        res.json({
            summary: {
                present: presentDays,
                leave: leaveDays,
                wfh: wfhDays
            },
            recentHistory: formattedHistory
        });

    } catch (error) {
        console.error('Error fetching employee dashboard data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
