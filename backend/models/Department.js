const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    DepartmentID: { type: Number, required: true, unique: true }, // We'll manually increment or use auto-increment if needed, but for now simple Number
    DepartmentName: { type: String, required: true }
});

module.exports = mongoose.model('Department', departmentSchema);
