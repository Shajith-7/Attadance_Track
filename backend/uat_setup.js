require('dotenv').config();
const mongoose = require('mongoose');

async function clean() {
    try {
        console.log('Connecting to db...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/AttendanceDB');
        const Employee = require('./models/Employee');
        const Attendance = require('./models/Attendance');
        const Leave = require('./models/Leave');
        const Payroll = require('./models/Payroll');
        
        const emp = await Employee.findOne({ Email: 'uat-20260811@company.com' });
        if (emp) {
            console.log('Found existing UAT employee. Deleting...');
            await Attendance.deleteMany({ EmployeeID: emp._id });
            await Leave.deleteMany({ EmployeeID: emp._id });
            await Payroll.deleteMany({ EmployeeID: emp._id });
            const AuditLog = require('./models/AuditLog');
            await AuditLog.deleteMany({ targetEmployee: emp._id });
            await Employee.deleteOne({ _id: emp._id });
            console.log('Cleaned up UAT employee.');
        } else {
            console.log('No UAT employee found.');
        }

        // Test Ports
        try {
            const resBackend = await fetch('http://localhost:5000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            console.log('Backend Port 5000 reachable: Status', resBackend.status);
        } catch (e) {
            console.log('Backend Port 5000 Unreachable!', e.message);
        }

        try {
            const resFrontend = await fetch('http://localhost:5173/');
            console.log('Frontend Port 5173 reachable: Status', resFrontend.status);
        } catch (e) {
            console.log('Frontend Port 5173 Unreachable!', e.message);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

clean();
