const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    EmployeeID: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    AttendanceDate: { type: Date, required: true }, // Just the date part
    ClockIn: { type: Date, required: true, default: Date.now },
    ClockOut: { type: Date, default: null },
    WorkMode: { type: String, default: 'WFO', enum: ['WFO', 'WFH', 'Hybrid'] },
    TotalHours: { type: Number, default: null },
    Status: { type: String, required: true }, // 'Working', 'Present', 'Late', 'Leave'
    IPAddress: { type: String, default: null }
}, { timestamps: true });

// Prevent duplicate attendance for the same employee on the same date
attendanceSchema.index({ EmployeeID: 1, AttendanceDate: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
