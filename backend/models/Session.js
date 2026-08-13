const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    SessionID: { type: String, required: true, unique: true }, // Keeping as String since we use crypto tokens
    EmployeeID: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    TokenHash: { type: String, required: true },
    ExpiresAt: { type: Date, required: true },
    LastActivityAt: { type: Date, default: Date.now },
    IPAddress: { type: String, default: null },
    UserAgent: { type: String, default: null },
    RevokedAt: { type: Date, default: null }
}, { timestamps: { createdAt: 'CreatedAt', updatedAt: false } });

module.exports = mongoose.model('Session', sessionSchema);
