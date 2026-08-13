const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
    EmployeeID: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    LeaveType: { type: String, required: true },
    RequestDate: { type: Date, required: true },
    Reason: { type: String, default: null },
    Status: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected'] }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
