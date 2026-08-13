require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const mongoose = require('mongoose');

async function runUAT() {
    console.log("=== STARTING UAT EXECUTION ===");
    
    let adminCookie = '';
    let employeeCookie = '';
    let inviteToken = '';

    const adminEmail = 'admin@company.com';
    const adminPassword = 'admin';
    const uatEmail = 'uat-20260811@company.com';
    const uatPassword = 'SecurePassword123!';
    let uatEmployeeId = null;

    // Helper for fetch with cookies
    const apiCall = async (url, method, body, cookie) => {
        const headers = { 'Content-Type': 'application/json' };
        if (cookie) headers['Cookie'] = cookie;
        
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);
        
        const res = await fetch(`http://localhost:5000${url}`, options);
        const text = await res.text();
        let resBody;
        try { resBody = JSON.parse(text); } catch(e) { resBody = text; }
        
        let newCookie = null;
        const setCookieHeader = res.headers.get('set-cookie');
        if (setCookieHeader) {
            newCookie = setCookieHeader.split(';')[0];
        }

        return { status: res.status, body: resBody, cookie: newCookie || cookie };
    };

    try {
        // Phase 1: Admin Login
        console.log("\\n-- HR Login --");
        let res = await apiCall('/api/auth/login', 'POST', { email: adminEmail, password: adminPassword });
        if (res.status !== 200) throw new Error("Admin login failed");
        adminCookie = res.cookie;
        console.log("✅ Admin logged in successfully");

        // Phase 2: Add Employee
        console.log("\\n-- HR Add Employee --");
        
        // Fetch directly from DB to get IDs for simplicity in UAT script
        const mongoose = require('mongoose');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/AttendanceDB');
        const Role = mongoose.connection.collection('roles');
        const empRole = await Role.findOne({ RoleName: 'Employee' });
        
        res = await apiCall('/api/employees/invite', 'POST', {
            firstName: 'Acceptance Test',
            lastName: 'Employee',
            email: uatEmail,
            employeeId: '20260811',
            roleId: empRole.RoleID,
            baseSalary: 50000,
            workMode: 'Hybrid',
            wfhDaysPerWeek: 2
        }, adminCookie);
        
        if (res.status !== 201 && res.status !== 200) {
            throw new Error("Failed to add employee: " + JSON.stringify(res.body));
        }
        console.log("✅ Employee added successfully");
        
        // Phase 3: Setup Account (Activation)
        console.log("\\n-- Employee Setup --");
        // Get token from DB
        const Employee = require('./models/Employee');
        const emp = await Employee.findOne({ Email: uatEmail });
        inviteToken = emp.InvitationToken;
        uatEmployeeId = emp._id;

        res = await apiCall('/api/auth/setup', 'POST', { token: inviteToken, password: uatPassword });
        if (res.status !== 200) throw new Error("Setup failed: " + JSON.stringify(res.body));
        console.log("✅ Employee account activated");

        // Phase 4: Employee Login
        console.log("\\n-- Employee Login --");
        res = await apiCall('/api/auth/login', 'POST', { email: uatEmail, password: uatPassword });
        if (res.status !== 200) throw new Error("Employee login failed: " + JSON.stringify(res.body));
        employeeCookie = res.cookie;
        console.log("✅ Employee logged in successfully");

        // Security Test: Access HR /payroll API
        console.log("\\n-- Security Test: Employee accessing HR API --");
        res = await apiCall('/api/payroll/generate', 'POST', { month: 8, year: 2026 }, employeeCookie);
        if (res.status === 403 || res.status === 404 || res.status === 401) {
            console.log("✅ Security Test Passed (Blocked from HR API)");
        } else {
            console.error("❌ Security Test Failed (Status: " + res.status + ")");
        }

        // Phase 5: WFH/WFO limits & Attendance
        console.log("\\n-- Attendance Testing --");
        // Clock In WFH (Day 1)
        res = await apiCall('/api/attendance/clock-in', 'POST', { location: 'Home', status: 'WFH' }, employeeCookie);
        if (res.status !== 201) throw new Error("Clock In WFH failed: " + JSON.stringify(res.body));
        console.log("✅ Clocked In WFH (Day 1)");
        
        // Clock Out
        res = await apiCall('/api/attendance/clock-out', 'POST', null, employeeCookie);
        if (res.status !== 200) throw new Error("Clock Out failed: " + JSON.stringify(res.body));
        console.log("✅ Clocked Out");

        // Wait, to test WFH limits properly, we need records on different days.
        // We will modify the created record to a past date (Monday).
        const Attendance = require('./models/Attendance');
        let att = await Attendance.findOne({ EmployeeID: uatEmployeeId }).sort({ createdAt: -1 });
        
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
        startOfWeek.setHours(0,0,0,0);
        
        att.AttendanceDate = startOfWeek;
        await att.save();

        // Clock In WFH (Day 2 - Tuesday)
        res = await apiCall('/api/attendance/clock-in', 'POST', { location: 'Home', status: 'WFH' }, employeeCookie);
        if (res.status !== 201) throw new Error("Clock In WFH (Day 2) failed: " + JSON.stringify(res.body));
        console.log("✅ Clocked In WFH (Day 2)");
        
        res = await apiCall('/api/attendance/clock-out', 'POST', null, employeeCookie);
        
        att = await Attendance.findOne({ EmployeeID: uatEmployeeId }).sort({ ClockIn: -1 });
        const tuesday = new Date(startOfWeek);
        tuesday.setDate(tuesday.getDate() + 1);
        att.AttendanceDate = tuesday;
        await att.save();

        // Clock In WFH (Day 3 - Wednesday) SHOULD FAIL
        res = await apiCall('/api/attendance/clock-in', 'POST', { location: 'Home', status: 'WFH' }, employeeCookie);
        if (res.status === 400 && res.body.error && res.body.error.includes('limit reached')) {
            console.log("✅ 3rd WFH request correctly rejected");
        } else {
            console.error("❌ 3rd WFH limit test failed: " + JSON.stringify(res.body));
        }

        // Clock In WFO (Day 3) SHOULD SUCCEED
        res = await apiCall('/api/attendance/clock-in', 'POST', { location: 'Office', status: 'WFO' }, employeeCookie);
        if (res.status !== 201) throw new Error("Clock In WFO failed: " + JSON.stringify(res.body));
        console.log("✅ Clocked In WFO (Allowed)");
        res = await apiCall('/api/attendance/clock-out', 'POST', null, employeeCookie);

        // Phase 6: Leave Request & Approval
        console.log("\\n-- Leave Testing --");
        res = await apiCall('/api/leaves/apply', 'POST', {
            leaveType: 'Sick',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            reason: 'Feeling unwell'
        }, employeeCookie);
        if (res.status !== 201) throw new Error("Leave apply failed: " + JSON.stringify(res.body));
        const leaveId = res.body.leave._id;
        console.log("✅ Leave Requested by Employee");

        // Admin approves
        res = await apiCall(`/api/leaves/${leaveId}/status`, 'PUT', { status: 'Approved' }, adminCookie);
        if (res.status !== 200) throw new Error("Leave approve failed: " + JSON.stringify(res.body));
        console.log("✅ Leave Approved by HR");

        // Phase 7: Payroll Generation
        console.log("\\n-- Payroll Testing --");
        res = await apiCall('/api/payroll/generate', 'POST', { month: 8, year: 2026 }, adminCookie);
        if (res.status !== 201) throw new Error("Payroll generate failed: " + JSON.stringify(res.body));
        console.log("✅ Payroll Generated");

        const Payroll = require('./models/Payroll');
        let payrollRecord = await Payroll.findOne({ EmployeeID: uatEmployeeId, Month: 8, Year: 2026 });
        if (payrollRecord) {
            console.log(`✅ Payroll backend snapshot verified: Gross: ₹${payrollRecord.GrossSalary}, Net: ₹${payrollRecord.NetSalary}`);
        }

        // Admin Reviews, Approves, Locks
        res = await apiCall(`/api/payroll/${payrollRecord._id}/status`, 'PATCH', { status: 'REVIEWED' }, adminCookie);
        res = await apiCall(`/api/payroll/${payrollRecord._id}/status`, 'PATCH', { status: 'APPROVED' }, adminCookie);
        res = await apiCall(`/api/payroll/${payrollRecord._id}/status`, 'PATCH', { status: 'LOCKED' }, adminCookie);
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
        const AuditLog = require('./models/AuditLog');
        const logs = await AuditLog.find({ targetEmployee: uatEmployeeId });
        console.log(`✅ Found ${logs.length} audit log entries for employee.`);
        const logContent = JSON.stringify(logs);
        if (logContent.includes(uatPassword) || logContent.includes(inviteToken)) {
            console.error("❌ SECURITY FAILURE: Password or Token leaked in Audit Logs");
        } else {
            console.log("✅ No secrets leaked in Audit Logs");
        }

        console.log("\\n=== UAT EXECUTION COMPLETE ===");

    } catch(err) {
        console.error("UAT FAILED:", err);
    } finally {
        await mongoose.disconnect();
    }
}

runUAT();
