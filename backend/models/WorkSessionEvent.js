const mongoose = require('mongoose');

const workSessionEventSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkSession', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    eventType: {
        type: String,
        required: true,
        enum: [
            "SESSION_STARTED",
            "TAB_VISIBLE",
            "TAB_HIDDEN",
            "AWAY_WARNING_STARTED",
            "SESSION_PAUSED",
            "BREAK_STARTED",
            "BREAK_ENDED",
            "SESSION_RESUMED",
            "SCREEN_SHARE_STARTED",
            "SCREEN_SHARE_ENDED",
            "HEARTBEAT",
            "SESSION_ENDED"
        ]
    },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: true, updatedAt: false } });

// Indexes
workSessionEventSchema.index({ sessionId: 1, timestamp: 1 });
workSessionEventSchema.index({ employeeId: 1, timestamp: -1 });

module.exports = mongoose.model('WorkSessionEvent', workSessionEventSchema);
