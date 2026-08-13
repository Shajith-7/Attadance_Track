const app = require('../backend/server.js');
const { connectDB } = require('../backend/db.js');

// Vercel serverless function entrypoint
module.exports = async (req, res) => {
    // Ensure database is connected before handling the request
    await connectDB();
    
    // Pass the request to the Express app
    return app(req, res);
};
