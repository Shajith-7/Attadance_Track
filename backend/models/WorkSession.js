const mongoose = require('mongoose');

const workSessionSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    shiftDate: { type: String, required: true }, // Format: YYYY-MM-DD
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }, // Optional, linking to standard attendance

    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },

    status: {
        type: String,
        required: true,
        enum: [
            "ACTIVE",
            "ON_BREAK",
            "AWAY_WARNING",
            "PAUSED",
            "COMPLETED",
            "FORCE_ENDED"
        ],
        default: "ACTIVE"
    },

    activeSeconds: { type: Number, default: 0 },
    awaySeconds: { type: Number, default: 0 },
    breakSeconds: { type: Number, default: 0 },

    hiddenAt: { type: Date, default: null }, // Used to calculate away time correctly server-side
    breakStartedAt: { type: Date, default: null },
    lastStateChangeAt: { type: Date, default: Date.now },

    lastTabVisibleAt: { type: Date, default: Date.now },
    lastHeartbeatAt: { type: Date, default: Date.now },

    screenShareConnected: { type: Boolean, default: true },

    consentGiven: { type: Boolean, required: true },
    consentAt: { type: Date, required: true },
    consentVersion: { type: String, required: true }
}, { timestamps: true });

// Indexes matching query patterns
workSessionSchema.index({ employeeId: 1, shiftDate: 1 });
workSessionSchema.index({ employeeId: 1, startedAt: -1 });
workSessionSchema.index({ status: 1, lastHeartbeatAt: 1 });

module.exports = mongoose.model('WorkSession', workSessionSchema);
