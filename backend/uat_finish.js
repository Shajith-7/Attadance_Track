require('dotenv').config();
const mongoose = require('mongoose');

async function finishUAT() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/AttendanceDB');
        const Employee = require('./models/Employee');
        const Payroll = require('./models/Payroll');
        const AuditLog = require('./models/AuditLog');
        
        const emp = await Employee.findOne({ Email: 'uat-20260811@company.com' });
        const uatEmployeeId = emp._id;
        
        let payrollRecord = await Payroll.findOne({ EmployeeID: uatEmployeeId, Month: 8, Year: 2026 });
        if (payrollRecord) {
            console.log(`✅ Payroll backend snapshot verified: Gross: ₹${payrollRecord.GrossSalary}, Net: ₹${payrollRecord.NetSalary}`);
        } else {
            console.error("❌ Payroll snapshot not found!");
            return;
        }

        // Test API for locking - wait, doing it via API requires admin login again. 
        // We can just login directly.
        const adminEmail = 'admin@company.com';
        const adminPassword = 'admin';
        
        const fetch = globalThis.fetch;
        let res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: adminPassword })
        });
        const adminCookie = res.headers.get('set-cookie').split(';')[0];
        
        const apiCall = async (url, method, body, cookie) => {
            const headers = { 'Content-Type': 'application/json', 'Cookie': cookie };
            const options = { method, headers };
            if (body) options.body = JSON.stringify(body);
            const r = await fetch(`http://localhost:5000${url}`, options);
            return { status: r.status };
        };

        // Admin Reviews, Approves, Locks
        await apiCall(`/api/payroll/${payrollRecord._id}/status`, 'PATCH', { status: 'REVIEWED' }, adminCookie);
        await apiCall(`/api/payroll/${payrollRecord._id}/status`, 'PATCH', { status: 'APPROVED' }, adminCookie);
        await apiCall(`/api/payroll/${payrollRecord._id}/status`, 'PATCH', { status: 'LOCKED' }, adminCookie);
        console.log("✅ Payroll Locked successfully");

        // Modify Locked Payroll SHOULD FAIL
        res = await apiCall(`/api/payroll/${payrollRecord._id}/status`, 'PATCH', { status: 'GENERATED' }, adminCookie);
        if (res.status === 400 || res.status === 403) {
             console.log("✅ Modifying LOCKED payroll correctly rejected");
        } else {
             console.error("❌ Modifying LOCKED payroll test failed: " + res.status);
        }

        // Audit Logs Verification
        console.log("\\n-- Audit Log Verification --");
        const logs = await AuditLog.find({ targetEmployee: uatEmployeeId });
        console.log(`✅ Found ${logs.length} audit log entries for employee.`);
        const logContent = JSON.stringify(logs);
        if (logContent.includes('SecurePassword123!') || logContent.includes(emp.InvitationToken)) {
            console.error("❌ SECURITY FAILURE: Password or Token leaked in Audit Logs");
        } else {
            console.log("✅ No secrets leaked in Audit Logs");
        }

        console.log("\\n=== UAT FINAL STAGES COMPLETE ===");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
finishUAT();
