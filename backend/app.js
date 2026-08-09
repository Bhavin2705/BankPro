const express = require('express');
const helmet = require('helmet');
const path = require('path');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const cors = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');
const emailService = require('./services/email');
const registerApiRoutes = require('./routes');
const { getConfig } = require('./config');

const createApp = () => {
    const app = express();
    app.set('trust proxy', 1);
    const config = getConfig();
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use(
        cookieParser(),
        cors,
        express.json({ limit: '10mb' }),
        express.urlencoded({ extended: true, limit: '10mb' }),
        mongoSanitize(),
        xss(),
        hpp()
    );
    app.use('/uploads', (req, res, next) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        next();
    }, express.static(path.join(__dirname, 'uploads')));
    app.options('*', cors);

    const redis = require('./config/redis');

    const healthHandler = (req, res) => {
        const dbState = mongoose.connection.readyState;
        const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

        res.status(200).json({
            success: true,
            status: 'ok',
            message: 'Bank Management API is running',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            environment: config.env,
            database: dbStatus,
            services: {
                email: emailService.getStatus().configured ? 'active' : 'unconfigured',
                redis: redis.getStatus().provider
            }
        });
    };

    // Health endpoints for external cron jobs (e.g. cron-job.org, UptimeRobot, Render keep-alive)
    app.get('/health', healthHandler);
    app.get('/api/health', healthHandler);
    app.get('/ping', (req, res) => res.status(200).send('pong'));

    registerApiRoutes(app);
    app.all('*', (req, res) => res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` }));
    app.use(errorHandler);

    return app;
};

module.exports = createApp;
