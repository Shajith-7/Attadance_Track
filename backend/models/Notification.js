const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    EmployeeID: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    Message: { type: String, required: true },
    IsRead: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'CreatedAt', updatedAt: false } });

module.exports = mongoose.model('Notification', notificationSchema);
