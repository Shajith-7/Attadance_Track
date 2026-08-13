const mongoose = require('mongoose');

const changeSchema = new mongoose.Schema({
    field: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true, index: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    targetEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false, index: true },
    changes: [changeSchema],
    ipAddress: { type: String },
    userAgent: { type: String },
    details: { type: mongoose.Schema.Types.Mixed } // For extra metadata
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('AuditLog', auditLogSchema);
