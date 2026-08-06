const express = require('express');
const helmet = require('helmet');
const path = require('path');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const cors = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');
const emailService = require('./services/email');
const registerApiRoutes = require('./routes');
const { getConfig } = require('./config');

const createApp = () => {
    const app = express();
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

    app.get('/health', (req, res) => res.status(200).json({
        success: true,
        message: 'Bank Management API is running',
        timestamp: new Date().toISOString(),
        environment: config.env,
        email: emailService.getStatus(),
        redis: redis.getStatus()
    }));

    registerApiRoutes(app);
    app.all('*', (req, res) => res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` }));
    app.use(errorHandler);

    return app;
};

module.exports = createApp;
