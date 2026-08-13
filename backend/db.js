const mongoose = require('mongoose');
require('dotenv').config();

// Global cache for serverless environments (like Vercel)
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    // If connection already established, return it
    if (cached.conn) {
        return cached.conn;
    }

    const isTest = process.env.NODE_ENV === 'test';
    const uri = isTest 
        ? (process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/attendanceDB_test')
        : (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/attendanceDB');

    // If a connection promise is not already in flight, create one
    if (!cached.promise) {
        const opts = {
            bufferCommands: false, // Disable Mongoose buffering
        };

        cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
            console.log('Connected to MongoDB (New Connection)');
            return mongooseInstance;
        });
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (err) {
        cached.promise = null; // Reset promise on error
        console.error('Database Connection Failed! ', err);
        throw err; // Let the caller handle the error
    }
};

module.exports = { connectDB };
