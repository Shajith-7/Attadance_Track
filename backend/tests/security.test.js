const fs = require('fs');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { spawn } = require('child_process');
const Employee = require('../models/Employee');
const Session = require('../models/Session');
const Role = require('../models/Role');
const argon2 = require('argon2');
const path = require('path');

const PORT = 5005; // Use a different port to avoid conflict with running dev server
const BASE_URL = `http://localhost:${PORT}/api`;

let serverProcess;
let passes = 0;
let fails = 0;

async function assert(condition, message) {
    if (condition) {
        console.log(`✅ PASS: ${message}`);
        passes++;
    } else {
        console.error(`❌ FAIL: ${message}`);
        fails++;
    }
}

require('dotenv').config();

// Determine Test URI from prod URI
const prodUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendanceDB';
const testUri = prodUri.replace('/AttendanceDB?', '/AttendanceDB_Test?').replace('/attendanceDB?', '/attendanceDB_Test?');

async function setupDatabase() {
    console.log('Connecting to Test Database...');
    await mongoose.connect(testUri);
    
    console.log('Clearing old test data...');
    await mongoose.connection.db.dropDatabase();

    const hash = await argon2.hash('password123');

    // Create Roles
    await Role.create([
        { RoleID: 1, RoleName: 'Employee' },
        { RoleID: 2, RoleName: 'Manager' },
        { RoleID: 3, RoleName: 'HR' },
        { RoleID: 4, RoleName: 'CEO' }
    ]);

    // Create Users
    const users = [
        { EmployeeID: 101, FirstName: 'Emp', LastName: 'A', Email: 'empa@test.com', RoleID: 1, Status: 'Active', PasswordHash: hash },
        { EmployeeID: 102, FirstName: 'Emp', LastName: 'B', Email: 'empb@test.com', RoleID: 1, Status: 'Active', PasswordHash: hash },
        { EmployeeID: 201, FirstName: 'Mgr', LastName: 'M', Email: 'mgr@test.com', RoleID: 2, Status: 'Active', PasswordHash: hash },
        { EmployeeID: 301, FirstName: 'HR', LastName: 'H', Email: 'hr@test.com', RoleID: 3, Status: 'Active', PasswordHash: hash },
        { EmployeeID: 401, FirstName: 'CEO', LastName: 'C', Email: 'ceo@test.com', RoleID: 4, Status: 'Active', PasswordHash: hash },
    ];

    await Employee.insertMany(users);
    console.log('Seed data inserted.');
}

async function login(email, password = 'password123') {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    const cookie = res.headers.get('set-cookie');
    return { status: res.status, data, cookie };
}

async function runTests() {
    console.log('\n--- Running Authentication Tests ---');
    const validLogin = await login('empa@test.com');
    await assert(validLogin.status === 200 && validLogin.data.authenticated, 'Valid login returns 200 and authenticated:true');

    const invalidLogin = await login('empa@test.com', 'wrongpassword');
    await assert(invalidLogin.status === 401, 'Wrong password returns 401');

    const missingLogin = await login('nonexistent@test.com');
    await assert(missingLogin.status === 401, 'Non-existent employee returns 401');

    console.log('\n--- Running Attendance IDOR & Manipulation Tests ---');
    // Login as Emp A
    const empASession = validLogin.cookie;
    
    // Clock in Emp A
    const clockInA = await fetch(`${BASE_URL}/attendance/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': empASession },
        body: JSON.stringify({ status: 'WFO' })
    });
    const clockInData = await clockInA.json();
    await assert(clockInA.status === 201, 'Emp A clocks in successfully');

    // Attempt Concurrent Clock In (Duplicate)
    const clockInA2 = await fetch(`${BASE_URL}/attendance/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': empASession },
        body: JSON.stringify({ status: 'WFO' })
    });
    await assert(clockInA2.status === 400, 'Duplicate clock-in is rejected safely (400)');

    // Attempt to manipulate attendance (send different employeeId)
    const maliciousClockIn = await fetch(`${BASE_URL}/attendance/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': empASession },
        body: JSON.stringify({ employeeId: '999999999999999999999999', status: 'WFH', totalHours: 100 })
    });
    // Check if the server ignored the malicious employeeId and just saw it as another duplicate clock-in for Emp A
    await assert(maliciousClockIn.status === 400, 'Malicious clock-in payload is rejected or scoped correctly');

    console.log('\n--- Running RBAC & Payroll Tests ---');
    // Try generating payroll as Employee A
    const genPayrollEmp = await fetch(`${BASE_URL}/payroll/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': empASession },
        body: JSON.stringify({ month: 8, year: 2026 })
    });
    await assert(genPayrollEmp.status === 403, 'Employee A cannot generate payroll (403)');

    // Login as HR
    const hrLogin = await login('hr@test.com');
    const hrSession = hrLogin.cookie;

    // Generate Payroll as HR
    const genPayrollHR = await fetch(`${BASE_URL}/payroll/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': hrSession },
        body: JSON.stringify({ month: 8, year: 2026 })
    });
    await assert(genPayrollHR.status === 200, 'HR can generate payroll (200)');

    // Fetch payrolls as HR
    const hrPayrollsRes = await fetch(`${BASE_URL}/payroll`, {
        headers: { 'Cookie': hrSession }
    });
    const hrPayrolls = await hrPayrollsRes.json();
    
    // Employee B Payroll ID
    const empBPayroll = hrPayrolls.find(p => p.EmployeeID && p.EmployeeID.FirstName === 'Emp' && p.EmployeeID.LastName === 'B');
    if (!empBPayroll) {
        throw new Error('Emp B Payroll not generated or not found in HR fetch');
    }

    // Emp A tries to access Emp B's payroll
    const empAAccessEmpB = await fetch(`${BASE_URL}/payroll/${empBPayroll._id}`, {
        headers: { 'Cookie': empASession }
    });
    await assert(empAAccessEmpB.status === 403 || empAAccessEmpB.status === 404, 'Emp A cannot access Emp B payroll (403/404)');
    
    const empAAccessEmpBData = await empAAccessEmpB.json();
    await assert(!empAAccessEmpBData.NetSalary, 'Emp A response does NOT contain Emp B sensitive data');

    console.log('\n--- Generating Security Report ---');
    const report = `# Security Test Report\n\nTotal Tests: ${passes + fails}\nPasses: ${passes}\nFails: ${fails}\n\nAll critical RBAC and IDOR tests were executed.`;
    fs.writeFileSync(path.join(__dirname, '..', '..', '..', '.gemini', 'antigravity-ide', 'brain', 'edf27d1f-42cd-47c7-96cc-c0694c15d875', 'security_report.md'), report);
    console.log('Report saved.');
}

async function start() {
    if (process.env.NODE_ENV !== 'test') {
        console.error('CRITICAL: NODE_ENV must be test to run security tests safely.');
        process.exit(1);
    }

    try {
        await setupDatabase();

        console.log(`Starting server on port ${PORT}...`);
        serverProcess = spawn('node', ['server.js'], {
            env: { ...process.env, PORT: PORT, NODE_ENV: 'test', MONGODB_TEST_URI: testUri },
            cwd: path.join(__dirname, '..'),
            shell: true
        });

        await new Promise((resolve, reject) => {
            let started = false;
            serverProcess.stdout.on('data', (data) => {
                const msg = data.toString();
                console.log(`Server: ${msg.trim()}`);
                if (msg.includes('Server running securely on port') || msg.includes(`port ${PORT}`)) {
                    if (!started) {
                        started = true;
                        resolve();
                    }
                }
            });
            serverProcess.stderr.on('data', (data) => {
                console.error(`Server Error: ${data.toString().trim()}`);
            });
            
            setTimeout(() => {
                if (!started) reject(new Error('Server start timeout'));
            }, 15000); // Wait up to 15s for remote DB connection
        });

        await runTests();

    } catch (err) {
        console.error('Test Execution Failed:', err);
    } finally {
        if (serverProcess) {
            console.log('Killing server...');
            serverProcess.kill();
        }
        await mongoose.connection.close();
        process.exit(fails > 0 ? 1 : 0);
    }
}

start();
