const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Employee = require('../models/Employee');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { createAuditLog } = require('../services/auditService');

// Email transporter configuration
const createTransporter = async () => {
    // If SMTP credentials are provided in .env, use them (Production)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    // Fallback to mock email (Ethereal) for development if no SMTP credentials exist
    console.log('No SMTP credentials found in .env, falling back to Ethereal mock email.');
    let testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
};

// HR creates a new employee and sends invitation
router.post('/invite', authenticate, authorize('HR', 'CEO', 'Admin', 'Administrator'), async (req, res) => {
    try {
        const { email, roleId } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Missing email field' });
        }

        // Check if email already exists
        const existingEmployee = await Employee.findOne({ Email: email });
            
        if (existingEmployee) {
            return res.status(400).json({ error: 'Employee with this email already exists' });
        }

        // Generate a random invitation token and placeholder ID
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const randomId = Math.floor(Math.random() * 900000) + 100000; // temporary random ID
        const employeeCode = `EMP-INV-${randomId}`;

        const newEmployee = await Employee.create({
            EmployeeID: randomId,
            EmployeeCode: employeeCode,
            FirstName: 'Pending',
            LastName: 'Setup',
            Email: email,
            RoleID: roleId || 2, // Default to Employee role
            InvitationToken: inviteToken,
            Status: 'Invited'
        });

        await createAuditLog(req, {
            action: 'EMPLOYEE_INVITED',
            targetEmployee: newEmployee._id,
            changes: [
                { field: 'Email', newValue: email },
                { field: 'RoleID', newValue: roleId || 2 }
            ]
        });

        // Send Email
        const transporter = await createTransporter();
        const setupLink = `http://localhost:5173/setup-account?token=${inviteToken}`;
        
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Attendance Admin" <admin@company.com>',
            to: email,
            subject: "Set up your Attendance Management Account",
            text: `Hello, welcome to the company! Please set up your account by clicking this link: ${setupLink}`,
            html: `<h3>Welcome to the team!</h3>
                   <p>Please click the button below to provide your details and activate your account.</p>
                   <a href="${setupLink}" style="padding: 10px 20px; background: #0066ff; color: white; text-decoration: none; border-radius: 5px;">Set Up Account</a>`
        });

        res.json({ 
            success: true, 
            message: 'Employee invited successfully',
            previewUrl: info.messageId ? nodemailer.getTestMessageUrl(info) : null
        });

    } catch (error) {
        console.error('Invite error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/employees (HR/Admin view all employees)
router.get('/', authenticate, authorize('HR', 'Manager', 'CEO', 'Admin', 'Administrator'), async (req, res) => {
    try {
        // Exclude CEO/Admin (RoleID 4) from the employee directory
        const employees = await Employee.find({ RoleID: { $ne: 4 } }).select('-PasswordHash').sort({ createdAt: -1 });
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
