const path = require('path');
const fs = require('fs');

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

const loadIfExists = p => {
    if (fs.existsSync(p)) require('dotenv').config({ path: p, override: false });
};

const loadEnv = () => {
    const env = String(process.env.NODE_ENV || 'development').toLowerCase();
    const root = path.resolve(__dirname, '..');
    [path.resolve(root, '.env'), path.resolve(root, `.env.${env}`), path.resolve(root, '.env.local'), path.resolve(root, `.env.${env}.local`)].forEach(loadIfExists);
    loadIfExists(path.resolve(__dirname, 'environments', env === 'production' ? 'production.env' : env === 'test' ? 'test.env' : 'development.env'));
};

const validateEnv = () => {
    const missing = requiredEnv.filter(name => !process.env[name]);
    if (!missing.length) return;
    if (process.env.NODE_ENV === 'development') return console.warn('Warning: Missing environment variables:', missing.join(', '));
    console.error('Error: Missing required environment variables:', missing.join(', '));
};

const getConfig = () => ({
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET
});

module.exports = { loadEnv, validateEnv, getConfig };
