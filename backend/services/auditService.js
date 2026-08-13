const AuditLog = require('../models/AuditLog');

const createAuditLog = async (req, { action, targetEmployee = null, changes = [], details = {} }) => {
    try {
        if (!req || !req.user || !req.user.employeeId) {
            console.warn('AuditLog: req.user not found, cannot log action', action);
            return;
        }

        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('user-agent');

        await AuditLog.create({
            action,
            performedBy: req.user.employeeId,
            targetEmployee,
            changes,
            ipAddress,
            userAgent,
            details
        });
    } catch (error) {
        console.error('AuditLog Error:', error);
        // Do not throw, audit logging should not break the main flow
    }
};

module.exports = { createAuditLog };
