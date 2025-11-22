const app = require('./BLL/app');
const db = require('./DAL/dbConnection');
const socketService = require('./BLL/services/socketService');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`
PowerShare Server Running
    `);
    console.log(`🔗 Local: http://localhost:${PORT}`);
});

// Initialize Socket.IO for real-time notifications
socketService.initialize(server);

// Setup automated cron jobs (billing, notifications, etc.)
require('./scripts/setupCronJobs');

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server...');
    server.close(() => {
        console.log('Server closed');
        db.end();
        process.exit(0);
    });
});

