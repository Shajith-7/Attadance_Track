const Session = require('../models/Session');
const Employee = require('../models/Employee');
const Role = require('../models/Role');

const authenticate = async (req, res, next) => {
    try {
        const sessionId = req.cookies.session_id;

        if (!sessionId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Find session and populate Employee
        const session = await Session.findOne({
            SessionID: sessionId,
            RevokedAt: null,
            ExpiresAt: { $gt: new Date() }
        }).populate('EmployeeID');

        if (!session || !session.EmployeeID) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        const employee = session.EmployeeID;

        if (employee.Status !== 'Active') {
            return res.status(403).json({ error: 'Account is not active' });
        }

        // Fetch role info
        const role = await Role.findOne({ RoleID: employee.RoleID });
        const roleName = role ? role.RoleName : 'Employee';

        // Update LastActivityAt
        session.LastActivityAt = new Date();
        await session.save();

        // Attach user info to request
        req.user = {
            employeeId: employee._id, // Mongo _id
            roleId: employee.RoleID,
            role: roleName
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
};

module.exports = { authenticate };
