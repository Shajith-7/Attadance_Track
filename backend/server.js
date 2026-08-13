const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./db');
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes = require('./routes/dashboard');
const leavesRoutes = require('./routes/leaves');
const workSessionRoutes = require('./routes/workSessions');

const app = express();

// Production Startup Safety Check
if (process.env.NODE_ENV === 'production') {
    const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'];
    const missing = requiredEnv.filter(envVar => !process.env[envVar]);
    if (missing.length > 0) {
        console.error(`CRITICAL ERROR: Missing required production environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
}

// Trust Proxy for secure cookies and rate limiting behind load balancers
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : clientUrl,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/work-sessions', workSessionRoutes);

// Protected routes (Examples)
const { authenticate } = require('./middleware/authenticate');
const { authorize } = require('./middleware/authorize');

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.'
    });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running securely on port ${PORT}`);
    });
});
