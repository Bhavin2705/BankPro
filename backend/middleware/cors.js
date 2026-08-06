const cors = require('cors');

const explicit = [process.env.FRONTEND_URL, ...(process.env.FRONTEND_URLS || '').split(',').map(s => s.trim()), 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:4173'].filter(Boolean);
const allowedOrigins = new Set(explicit);
const allowVercel = String(process.env.ALLOW_VERCEL_PREVIEWS || '').toLowerCase() === 'true';

const isAllowed = origin => {
    if (!origin) return true;
    try {
        const host = new URL(origin).hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) return true;
    } catch (_) { return false; }
    return allowedOrigins.has(origin);
};

module.exports = cors({
    origin: (origin, cb) => {
        if (isAllowed(origin)) {
            return cb(null, true);
        }
        const error = new Error(`Not allowed by CORS: ${origin}`);
        error.statusCode = 403;
        return cb(error);
    },
    credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
});
