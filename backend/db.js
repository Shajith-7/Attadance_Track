const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const isTest = process.env.NODE_ENV === 'test';
        const uri = isTest 
            ? (process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/attendanceDB_test')
            : (process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendanceDB');
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Database Connection Failed! ', err);
        process.exit(1);
    }
};

module.exports = { connectDB };
