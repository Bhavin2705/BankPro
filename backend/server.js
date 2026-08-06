const http = require('http');
const { loadEnv, validateEnv, getConfig } = require('./config');

loadEnv();
validateEnv();

const connectDB = require('./config/database');
const createApp = require('./app');
const configureSocket = require('./socket');
const emailService = require('./services/email');

connectDB();

const app = createApp();
const server = http.createServer(app);
configureSocket(server);

const config = getConfig();
const PORT = config.port || 5000;

server.listen(PORT, () => {
    console.log(`Server running in ${config.env} mode on port ${PORT}`);
    const emailStatus = emailService.getStatus();
    console.log(emailStatus.configured ? 'Resend API initialized: email service ready.' : 'Resend status: RESEND_API_KEY not configured (emails suppressed).');
});

process.on('unhandledRejection', err => {
    console.error(`Unhandled Rejection: ${err?.message || err}`);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', err => {
    console.error(`Uncaught Exception: ${err?.message || err}`);
    process.exit(1);
});

module.exports = app;
