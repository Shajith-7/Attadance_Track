const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    EmployeeID: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    LeaveType: { type: String, required: true, enum: ['Sick', 'Casual', 'Earned', 'Unpaid'] },
    StartDate: { type: Date, required: true },
    EndDate: { type: Date, required: true },
    Reason: { type: String, required: true },
    Status: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected'] },
    ReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null }
}, { timestamps: true });

leaveSchema.index({ EmployeeID: 1, Status: 1 });
leaveSchema.index({ StartDate: 1, EndDate: 1 });

module.exports = mongoose.model('Leave', leaveSchema);
