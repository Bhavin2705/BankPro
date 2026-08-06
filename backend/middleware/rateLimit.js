const rateLimit = require('express-rate-limit');

const skip = () => {
    const env = String(process.env.NODE_ENV || 'development').toLowerCase();
    return env === 'test' || Boolean(process.env.JEST_WORKER_ID) || (env !== 'production' && process.env.RATE_LIMIT_IN_DEV !== 'true');
};

const parse = (val, fb) => { const n = parseInt(val, 10); return Number.isFinite(n) ? n : fb; };

const makeLimiter = (winEnv, winDef, maxEnv, maxDef, error) => rateLimit({
    windowMs: parse(process.env[winEnv], winDef) * 60 * 1000,
    max: parse(process.env[maxEnv], maxDef),
    message: { success: false, error },
    standardHeaders: true, legacyHeaders: false, skip
});

module.exports = {
    apiLimiter: makeLimiter('RATE_LIMIT_WINDOW', 15, 'RATE_LIMIT_MAX_REQUESTS', 100, 'Too many requests from this IP, please try again later.'),
    authLimiter: makeLimiter('AUTH_RATE_LIMIT_WINDOW_MINUTES', 15, 'AUTH_RATE_LIMIT_MAX_REQUESTS', 30, 'Too many authentication attempts, please try again later.'),
    passwordResetLimiter: makeLimiter('PASSWORD_RESET_RATE_LIMIT_WINDOW_MINUTES', 60, 'PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS', 5, 'Too many password reset attempts, please try again later.'),
    transactionLimiter: makeLimiter('TRANSACTION_RATE_LIMIT_WINDOW_MINUTES', 15, 'TRANSACTION_RATE_LIMIT_MAX_REQUESTS', 40, 'Too many transaction requests, please try again later.'),
    uploadLimiter: makeLimiter('UPLOAD_RATE_LIMIT_WINDOW_MINUTES', 60, 'UPLOAD_RATE_LIMIT_MAX_REQUESTS', 10, 'Too many file upload attempts, please try again later.'),
    lookupLimiter: makeLimiter('LOOKUP_RATE_LIMIT_WINDOW_MINUTES', 10, 'LOOKUP_RATE_LIMIT_MAX_REQUESTS', 60, 'Too many lookup requests, please try again later.'),
    pinLimiter: makeLimiter('PIN_RATE_LIMIT_WINDOW_MINUTES', 15, 'PIN_RATE_LIMIT_MAX_REQUESTS', 20, 'Too many PIN attempts, please try again later.'),
    settingsWriteLimiter: makeLimiter('SETTINGS_RATE_LIMIT_WINDOW_MINUTES', 15, 'SETTINGS_RATE_LIMIT_MAX_REQUESTS', 50, 'Too many settings updates, please try again later.')
};
