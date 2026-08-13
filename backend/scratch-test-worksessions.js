require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./db');
const Employee = require('./models/Employee');
const WorkSession = require('./models/WorkSession');
const WorkSessionEvent = require('./models/WorkSessionEvent');
const request = require('supertest');
const express = require('express');
const workSessionRoutes = require('./routes/workSessions');

const app = express();
app.use(express.json());
let testUser = null;

// Mock auth middleware for testing
app.use('/api/work-sessions', (req, res, next) => {
    req.user = testUser;
    next();
}, workSessionRoutes);

async function runTests() {
    await connectDB();
    console.log('Connected to DB');

    // Setup test employee
    let emp = await Employee.findOne({}); // Any employee
    if (!emp) {
        emp = await Employee.create({
            FirstName: 'Test', LastName: 'User', Email: 'test@example.com', RoleID: 2
        });
    }
    testUser = { employeeId: emp._id, role: 'Employee' };

    // Clean up previous test data
    await WorkSession.deleteMany({ employeeId: emp._id });
    await WorkSessionEvent.deleteMany({ employeeId: emp._id });

    console.log('\n--- Starting Tests ---');

    // Test 1: Start Session
    let res = await request(app)
        .post('/api/work-sessions/start')
        .send({ shiftDate: '2026-08-12', consentGiven: true, consentVersion: '1.0' });
    
    console.log('Start Session:', res.status === 201 ? 'PASS' : 'FAIL', res.body);
    const sessionId = res.body._id;

    // Test 2: Start duplicate session (should fail)
    res = await request(app)
        .post('/api/work-sessions/start')
        .send({ shiftDate: '2026-08-12', consentGiven: true, consentVersion: '1.0' });
    console.log('Duplicate Session Rejected:', res.status === 400 ? 'PASS' : 'FAIL', res.body);

    // Test 3: Tab Hidden
    res = await request(app)
        .post(`/api/work-sessions/${sessionId}/events`)
        .send({ type: 'TAB_HIDDEN' });
    console.log('Tab Hidden (Status AWAY_WARNING):', res.body.status === 'AWAY_WARNING' ? 'PASS' : 'FAIL', res.body.status);

    // Simulate waiting 11 minutes (manipulating the DB for test purposes)
    await WorkSession.updateOne({ _id: sessionId }, { $set: { hiddenAt: new Date(Date.now() - 11 * 60000) } });

    // Test 4: Heartbeat should pause the session
    res = await request(app)
        .post(`/api/work-sessions/${sessionId}/events`)
        .send({ type: 'HEARTBEAT' });
    console.log('10-Min Inactivity Auto-Pause:', res.body.status === 'PAUSED' ? 'PASS' : 'FAIL', res.body.status);

    // Test 5: Resume Session
    res = await request(app)
        .post(`/api/work-sessions/${sessionId}/events`)
        .send({ type: 'SESSION_RESUMED' });
    console.log('Session Resumed (Status ACTIVE):', res.body.status === 'ACTIVE' ? 'PASS' : 'FAIL', res.body.status);

    // Test 6: Start Break
    res = await request(app)
        .post(`/api/work-sessions/${sessionId}/events`)
        .send({ type: 'BREAK_STARTED' });
    console.log('Break Started (Status ON_BREAK):', res.body.status === 'ON_BREAK' ? 'PASS' : 'FAIL', res.body.status);

    // Test 7: End Session
    res = await request(app)
        .post(`/api/work-sessions/${sessionId}/events`)
        .send({ type: 'SESSION_ENDED' });
    console.log('Session Ended (Status COMPLETED):', res.body.status === 'COMPLETED' ? 'PASS' : 'FAIL', res.body.status);

    // Test 8: Admin can view live sessions
    testUser = { employeeId: emp._id, role: 'Admin' };
    res = await request(app)
        .get('/api/work-sessions/admin/live');
    console.log('Admin live view:', res.status === 200 ? 'PASS' : 'FAIL');

    console.log('--- Tests Complete ---');
    process.exit(0);
}

runTests();
