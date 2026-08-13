require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./db');
const WorkSession = require('./models/WorkSession');
const Attendance = require('./models/Attendance');

async function clearData() {
  try {
    await connectDB();
    await WorkSession.deleteMany({});
    await Attendance.deleteMany({});
    console.log('Successfully cleared all Work Sessions and Attendance records.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

clearData();
