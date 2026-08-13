require('dotenv').config();
const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const { connectDB } = require('./db');

async function check() {
  await connectDB();
  const emps = await Employee.find({});
  console.log("Employees in DB:", emps.map(e => ({email: e.Email})));
  process.exit(0);
}
check();
