const cors = require('cors');

const explicit = [
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS || '').split(',').map(s => s.trim()),
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4173'
].filter(Boolean);

const allowedOrigins = new Set(explicit);

const isAllowed = origin => {
    if (!origin) return true;
    try {
        const host = new URL(origin).hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app') || host.endsWith('.onrender.com')) {
            return true;
        }
    } catch (_) {
        return false;
    }
    return allowedOrigins.has(origin);
};

const corsMiddleware = cors({
    origin: (origin, callback) => {
        if (!origin || isAllowed(origin)) {
            return callback(null, origin || '*');
        }
        console.warn(`[CORS] Rejected origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
});

module.exports = corsMiddleware;
