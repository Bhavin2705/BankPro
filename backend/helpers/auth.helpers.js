const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_EXPIRE_DAYS = parseInt(process.env.JWT_EXPIRE_DAYS, 10) || 7;
const JWT_REFRESH_EXPIRE_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRE_DAYS, 10) || 30;

const getJwtSecret = () => process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET missing'); })();
const getJwtRefreshSecret = () => process.env.JWT_REFRESH_SECRET || (() => { throw new Error('JWT_REFRESH_SECRET missing'); })();
const sameSite = ['lax', 'strict', 'none'].includes(String(process.env.COOKIE_SAME_SITE || '').toLowerCase()) ? String(process.env.COOKIE_SAME_SITE).toLowerCase() : 'none';

const generateToken = id => jwt.sign({ id, tokenType: 'access' }, getJwtSecret(), { expiresIn: process.env.JWT_EXPIRE || `${JWT_EXPIRE_DAYS}d` });
const generateRefreshToken = id => jwt.sign({ id, tokenType: 'refresh' }, getJwtRefreshSecret(), { expiresIn: process.env.JWT_REFRESH_EXPIRE || `${JWT_REFRESH_EXPIRE_DAYS}d` });

const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? sameSite : 'Lax', maxAge: JWT_EXPIRE_DAYS * 86400000 };
const refreshCookieOptions = { ...cookieOptions, maxAge: JWT_REFRESH_EXPIRE_DAYS * 86400000 };
const clearTokenCookieOptions = (({ maxAge, ...c }) => c)(cookieOptions);
const clearRefreshCookieOptions = (({ maxAge, ...c }) => c)(refreshCookieOptions);

const hashTwoFactorOtp = otp => crypto.createHash('sha256').update(String(otp)).digest('hex');

const initiateTwoFactorLogin = async (user, req, res, sendLoginOtpEmail) => {
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    user.security = { ...(user.security || {}), twoFactorOtpHash: hashTwoFactorOtp(otpCode), twoFactorOtpExpires: new Date(Date.now() + 600000) };
    await user.save({ validateBeforeSave: false });

    if (!await sendLoginOtpEmail(user.email, user.name, otpCode)) return res.status(503).json({ success: false, error: 'Unable to send OTP email.' });
    res.status(202).json({ success: false, requiresTwoFactor: true, message: 'A 6-digit OTP has been sent to your registered email.' });
};

const verifyTwoFactorOtp = (user, otp) => user?.security?.twoFactorOtpHash && new Date(user.security.twoFactorOtpExpires) >= new Date() && hashTwoFactorOtp(otp) === user.security.twoFactorOtpHash;

const appendLoginHistoryEntry = (user, req) => {
    const ip = (String(req.headers['x-forwarded-for'] || '').split(',')[0] || req.ip || req.socket?.remoteAddress || 'Unknown').trim();
    user.clientData = user.clientData || {};
    const hist = Array.isArray(user.clientData.loginHistory) ? user.clientData.loginHistory : [];
    user.clientData.loginHistory = [...hist, { timestamp: new Date(), ip, device: req.headers['user-agent'] || 'Unknown', status: 'SUCCESS' }].slice(-10);
};

const setAuthCookies = (res, token, refreshToken) => { res.cookie('token', token, cookieOptions); res.cookie('refreshToken', refreshToken, refreshCookieOptions); };

const buildAuthenticatedUserResponse = u => ({ _id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, balance: u.balance, accountNumber: u.accountNumber, bankDetails: u.bankDetails, profile: u.profile, kyc: u.kyc, preferences: u.preferences, createdAt: u.createdAt, firstLogin: u.firstLogin });

const redis = require('../config/redis');

const blacklistToken = async (token, ttlSeconds = JWT_EXPIRE_DAYS * 86400) => {
    if (!token) return;
    try {
        await redis.set(`bank:token:blacklist:${token}`, '1', { ex: ttlSeconds });
    } catch {
        // no-op
    }
};

const isTokenBlacklisted = async (token) => {
    if (!token) return false;
    try {
        const result = await redis.get(`bank:token:blacklist:${token}`);
        return result === '1';
    } catch {
        return false;
    }
};

module.exports = { generateToken, generateRefreshToken, getJwtRefreshSecret, cookieOptions, clearTokenCookieOptions, clearRefreshCookieOptions, initiateTwoFactorLogin, verifyTwoFactorOtp, appendLoginHistoryEntry, setAuthCookies, buildAuthenticatedUserResponse, blacklistToken, isTokenBlacklisted };
