const express = require('express');
const router = express.Router();
const argon2 = require('argon2');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const nodemailer = require('nodemailer');
const Employee = require('../models/Employee');
const Session = require('../models/Session');
const Role = require('../models/Role');
const { authenticate } = require('../middleware/authenticate');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs for sensitive auth actions
    message: { error: 'Too many attempts from this IP, please try again after 15 minutes' }
});

// Helper to generate a random secure string
const generateSessionToken = () => crypto.randomBytes(32).toString('hex');

// Email transporter configuration
const createTransporter = async () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    let testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
    });
};

// Check if first run (no employees exist)
router.get('/check-first-run', async (req, res) => {
    try {
        const count = await Employee.countDocuments();
        res.json({ isFirstRun: count === 0 });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register Admin (only if first run)
router.post('/register-admin', authLimiter, async (req, res) => {
    try {
        const count = await Employee.countDocuments();
        if (count > 0) {
            return res.status(403).json({ error: 'Registration is locked. Please contact your administrator for an invitation.' });
        }

        const { firstName, lastName, email, password } = req.body;
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const passwordHash = await argon2.hash(password);

        // EmployeeID: generate a random number for admin, e.g., 1000
        const admin = await Employee.create({
            EmployeeID: 1000,
            EmployeeCode: 'EMP-1000',
            FirstName: firstName,
            LastName: lastName,
            Email: email,
            RoleID: 1, // 1 = Admin/CEO
            Status: 'Active',
            PasswordHash: passwordHash
        });

        res.json({ success: true, message: 'Admin account created successfully' });
    } catch (error) {
        console.error('Admin register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password, token2fa } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email/Employee ID and password required' });

        // Try looking up by Email or EmployeeID
        const query = isNaN(email) && !email.startsWith('EMP') 
            ? { Email: email, Status: 'Active' }
            : { $or: [{ Email: email }, { EmployeeCode: email }, { EmployeeID: !isNaN(email) ? Number(email) : -1 }], Status: 'Active' };

        const user = await Employee.findOne(query);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await argon2.verify(user.PasswordHash, password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 2FA Verification
        if (user.IsTwoFactorEnabled) {
            if (!token2fa) {
                return res.status(401).json({ error: '2FA token required', require2FA: true });
            }
            const isValid2FA = authenticator.verify({ token: token2fa, secret: user.TwoFactorSecret });
            if (!isValid2FA) {
                return res.status(401).json({ error: 'Invalid 2FA token' });
            }
        }

        // Create Session
        const sessionToken = generateSessionToken();
        const tokenHash = await argon2.hash(sessionToken); 

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await Session.create({
            SessionID: sessionToken,
            EmployeeID: user._id,
            TokenHash: tokenHash,
            ExpiresAt: expiresAt,
            IPAddress: req.ip,
            UserAgent: req.headers['user-agent']
        });

        // Set HttpOnly Cookie
        res.cookie('session_id', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Get Role Name
        const role = await Role.findOne({ RoleID: user.RoleID });
        const roleName = role ? role.RoleName : 'Employee';
        
        const isNightShift = user.AssignedShift === 'NIGHT';

        res.json({
            authenticated: true,
            user: {
                employeeId: user._id, // sending mongo objectId instead of sql ID
                name: `${user.FirstName} ${user.LastName}`,
                role: roleName,
                assignedShift: user.AssignedShift,
                isNightShift
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Current User (Me)
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await Employee.findById(req.user.employeeId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isNightShift = user.AssignedShift === 'NIGHT';

        res.json({
            authenticated: true,
            user: {
                employeeId: req.user.employeeId,
                name: `${user.FirstName} ${user.LastName}`,
                role: req.user.role,
                email: user.Email,
                assignedShift: user.AssignedShift,
                isNightShift
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
    try {
        const sessionId = req.cookies.session_id;
        
        if (sessionId) {
            await Session.findOneAndUpdate(
                { SessionID: sessionId }, 
                { RevokedAt: new Date() }
            );
        }

        res.clearCookie('session_id', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
        });
        res.json({ success: true, message: 'Logged out' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2FA Setup (Generate Secret)
router.post('/2fa/setup', authenticate, async (req, res) => {
    try {
        const secret = authenticator.generateSecret();
        const user = await Employee.findById(req.user.employeeId);
            
        const otpauth = authenticator.keyuri(user.Email, 'AttendanceMS', secret);
        const qrCodeImage = await qrcode.toDataURL(otpauth);

        // Store secret temporarily or permanently (unverified)
        user.TwoFactorSecret = secret;
        await user.save();

        res.json({ secret, qrCodeImage });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error setting up 2FA' });
    }
});

// 2FA Verify & Enable
router.post('/2fa/verify', authenticate, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await Employee.findById(req.user.employeeId);
            
        const secret = user.TwoFactorSecret;
        const isValid = authenticator.verify({ token, secret });

        if (isValid) {
            user.IsTwoFactorEnabled = true;
            await user.save();
            res.json({ success: true, message: '2FA enabled successfully' });
        } else {
            res.status(400).json({ error: 'Invalid token' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error verifying 2FA' });
    }
});

// Get Setup Account Details
router.get('/setup/:token', async (req, res) => {
    try {
        const emp = await Employee.findOne({ InvitationToken: req.params.token });
        if (!emp || emp.Status !== 'Invited') {
            return res.status(404).json({ error: 'Invalid or expired invitation link' });
        }

        res.json({
            firstName: emp.FirstName,
            lastName: emp.LastName,
            email: emp.Email,
            employeeCode: emp.EmployeeCode,
            employeeId: emp.EmployeeID
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Request OTP for Setup
router.post('/setup/send-otp', authLimiter, async (req, res) => {
    try {
        const { token, employeeId } = req.body;
        if (!token || !employeeId) {
            return res.status(400).json({ error: 'Token and Employee ID required' });
        }
        
        const emp = await Employee.findOne({ InvitationToken: token });
        if (!emp || emp.Status !== 'Invited') {
            return res.status(400).json({ error: 'Invalid or expired invitation link' });
        }

        // Validate EmployeeID uniqueness
        const idTaken = await Employee.findOne({ EmployeeID: Number(employeeId) });
        if (idTaken && idTaken._id.toString() !== emp._id.toString()) {
            return res.status(400).json({ error: 'This Employee ID is already in use.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 10); // OTP valid for 10 minutes
        
        emp.SetupOtp = otp;
        emp.SetupOtpExpiry = expiry;
        await emp.save();

        // Send Email
        const transporter = await createTransporter();
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Attendance Admin" <admin@company.com>',
            to: emp.Email,
            subject: 'Account Setup OTP - Attendance MS',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                    <h2 style="color: #333; text-align: center;">Verify Your Account</h2>
                    <p style="color: #555; font-size: 16px;">Hello,</p>
                    <p style="color: #555; font-size: 16px;">You are setting up your employee account. Please use the following One-Time Password (OTP) to complete your registration:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4F46E5; background: #f4f4f5; padding: 10px 20px; border-radius: 8px;">${otp}</span>
                    </div>
                    <p style="color: #777; font-size: 14px; text-align: center;">This code will expire in 10 minutes.</p>
                </div>
            `
        });

        res.json({ success: true, message: 'OTP sent to your email.' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Setup Account (First time activation)
router.post('/setup', authLimiter, async (req, res) => {
    try {
        const { token, password, firstName, lastName, employeeId, otp } = req.body;
        
        if (!token || !password || !firstName || !lastName || !employeeId || !otp) {
            return res.status(400).json({ error: 'All fields and OTP are required' });
        }

        // Find employee by token
        const emp = await Employee.findOne({ InvitationToken: token });
            
        if (!emp) {
            return res.status(400).json({ error: 'Invalid or expired invitation link' });
        }
        
        if (emp.Status !== 'Invited') {
            return res.status(400).json({ error: 'Account has already been set up' });
        }

        // Verify OTP
        if (emp.SetupOtp !== otp || !emp.SetupOtpExpiry || new Date() > emp.SetupOtpExpiry) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Hash new password
        const passwordHash = await argon2.hash(password);

        // Update employee
        emp.FirstName = firstName;
        emp.LastName = lastName;
        emp.EmployeeID = Number(employeeId);
        emp.EmployeeCode = `EMP-${employeeId}`;
        emp.PasswordHash = passwordHash;
        emp.Status = 'Active';
        emp.InvitationToken = null;
        emp.SetupOtp = null;
        emp.SetupOtpExpiry = null;
        await emp.save();

        res.json({ success: true, message: 'Account set up successfully. You may now log in.' });

    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
