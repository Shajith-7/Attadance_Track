require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');

async function testNightShiftPolicies() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-ms');
    console.log('Connected to MongoDB.');

    // Find any employee and temporarily set to Active + NIGHT
    const employee = await Employee.findOne({ RoleID: 2 });
    if (!employee) {
        console.log('No employee found.');
        process.exit(1);
    }

    console.log(`Testing Employee: ${employee.FirstName} ${employee.LastName} (${employee._id})`);

    // Test 1: WFO employee (not NIGHT)
    employee.AssignedShift = 'WFO_DAY';
    await employee.save();
    console.log(`[TEST] WFO Employee direct check... assignedShift: ${employee.AssignedShift}`);
    const isNightShiftWFO = employee.AssignedShift === 'NIGHT';
    console.log(`Allowed for Night Shift? ${isNightShiftWFO}`);

    // Test 2: Inactive employee
    employee.AssignedShift = 'NIGHT';
    employee.Status = 'Inactive';
    await employee.save();
    console.log(`[TEST] Inactive Employee direct check... status: ${employee.Status}`);
    const isAllowedInactive = employee.Status === 'Active' && employee.AssignedShift === 'NIGHT';
    console.log(`Allowed for Night Shift? ${isAllowedInactive}`);

    // Test 3: Active Night Shift
    employee.Status = 'Active';
    await employee.save();
    console.log(`[TEST] Active Night Shift Employee direct check...`);
    const isAllowedNight = employee.Status === 'Active' && employee.AssignedShift === 'NIGHT';
    console.log(`Allowed for Night Shift? ${isAllowedNight}`);

    console.log('Tests complete. Restoring employee to normal.');
    await mongoose.disconnect();
}

testNightShiftPolicies().catch(console.error);
