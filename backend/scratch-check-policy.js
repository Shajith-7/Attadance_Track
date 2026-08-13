const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();
const { connectDB } = require('./db');
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
const Session = require('./models/Session');

async function runTests() {
    await connectDB();

    console.log('\n--- Cleaning up previous test data ---');
    await Employee.deleteMany({ Email: { $regex: 'test_policy' } });
    
    // Hardcode some object IDs so we can clean up attendance easily
    const ids = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
    ];
    await Attendance.deleteMany({ EmployeeID: { $in: ids } });

    console.log('\n--- Creating Test Employees ---');
    const empWFO = await Employee.create({ _id: ids[0], EmployeeID: 901, FirstName: 'Test', LastName: 'WFO', Email: 'test_policy_wfo@company.com', RoleID: 2, WorkMode: 'WFO', Status: 'Active' });
    const empWFH = await Employee.create({ _id: ids[1], EmployeeID: 902, FirstName: 'Test', LastName: 'WFH', Email: 'test_policy_wfh@company.com', RoleID: 2, WorkMode: 'WFH', Status: 'Active' });
    const empHybrid = await Employee.create({ _id: ids[2], EmployeeID: 903, FirstName: 'Test', LastName: 'Hybrid', Email: 'test_policy_hybrid@company.com', RoleID: 2, WorkMode: 'Hybrid', WfhDaysPerWeek: 1, Status: 'Active' });
    const empHybridOver = await Employee.create({ _id: ids[3], EmployeeID: 904, FirstName: 'Test', LastName: 'HybridOver', Email: 'test_policy_hybrid_over@company.com', RoleID: 2, WorkMode: 'Hybrid', WfhDaysPerWeek: 0, Status: 'Active' });

    const createSession = async (empId) => {
        const sessionToken = crypto.randomBytes(32).toString('hex');
        await Session.create({
            SessionID: sessionToken,
            TokenHash: sessionToken,
            EmployeeID: empId,
            ExpiresAt: new Date(Date.now() + 1000 * 60 * 60)
        });
        return sessionToken;
    };

    const testClockIn = async (empId, mode, expectedStatus, testName) => {
        try {
            const token = await createSession(empId);
            const res = await fetch('http://localhost:5000/api/attendance/clock-in', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cookie': `session_id=${token}`
                },
                body: JSON.stringify({ status: mode, location: 'Test' })
            });
            const data = await res.json();
            
            const passed = res.status === expectedStatus;
            console.log(`${passed ? '✅' : '❌'} [${testName}] - Expected: ${expectedStatus}, Got: ${res.status}`);
            if (!passed) console.log(`   Response: ${JSON.stringify(data)}`);
            
            // Clean up attendance so we can run again if needed
            await Attendance.deleteMany({ EmployeeID: empId });
        } catch (e) {
            console.error(`Error in test ${testName}:`, e.message);
        }
    };

    console.log('\n--- Running Policy Tests ---');
    
    await testClockIn(ids[0], 'WFO', 201, 'WFO Policy requests WFO');
    await testClockIn(ids[0], 'WFH', 400, 'WFO Policy requests WFH (Should Reject)');
    
    await testClockIn(ids[1], 'WFH', 201, 'WFH Policy requests WFH');
    await testClockIn(ids[1], 'WFO', 201, 'WFH Policy requests WFO'); // Allowed to visit office

    await testClockIn(ids[2], 'WFH', 201, 'Hybrid Policy requests WFH (Within limit of 1)');
    
    // For Hybrid Over Limit, we mock that they already have 1 WFH day this week.
    // Since empHybridOver is set to WfhDaysPerWeek: 0, it should fail immediately.
    await testClockIn(ids[3], 'WFH', 400, 'Hybrid Policy requests WFH (Over limit of 0)');

    console.log('\n--- Tests Completed ---');
    process.exit(0);
}

runTests();
