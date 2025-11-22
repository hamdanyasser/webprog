const app = require('./BLL/app');
const db = require('./DAL/dbConnection');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`
PowerShare Server Running
    `);
    console.log(`🔗 Local: http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server...');
    server.close(() => {
        console.log('Server closed');
        db.end();
        process.exit(0);
    });
});

