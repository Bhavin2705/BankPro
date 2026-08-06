const jwt = require('jsonwebtoken');
const User = require('../models/User');
const passwordService = require('./password.service');
const profileService = require('./profile.service');
const emailService = require('./email');
const {
    generateToken,
    generateRefreshToken,
    getJwtRefreshSecret,
    setAuthCookies,
    initiateTwoFactorLogin,
    verifyTwoFactorOtp,
    appendLoginHistoryEntry,
    buildAuthenticatedUserResponse,
    blacklistToken
} = require('../helpers/auth.helpers');
const asyncHandler = require('../utils/asyncHandler');

const register = async (req, res) => {
    const { name, email, phone, password, pin, bankDetails } = req.body;
    const existing = await User.findOne({ $or: [{ email: email?.toLowerCase() }, { phone }] });
    if (existing) {
        const error = new Error('Email or phone number already registered');
        error.statusCode = 400;
        throw error;
    }

    const user = new User({
        name,
        email,
        phone,
        password,
        pin,
        bankDetails,
        balance: 0
    });
    await user.save();

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setAuthCookies(res, token, refreshToken);

    res.status(201).json({
        success: true,
        data: buildAuthenticatedUserResponse(user),
        token
    });
};

const login = async (req, res) => {
    const { email, identifier, phone, password, otp } = req.body;
    const loginId = identifier || email || phone;
    if (!loginId || !password) {
        const error = new Error('Please provide email and password');
        error.statusCode = 400;
        throw error;
    }

    const cleanId = String(loginId).trim();
    const cleanEmail = cleanId.toLowerCase();
    const user = await User.findOne({
        $or: [
            { email: cleanEmail },
            { phone: cleanId },
            { accountNumber: cleanId }
        ]
    }).select('+password +security');
    if (!user || !(await user.comparePassword(password))) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    if (user.status === 'suspended') {
        const error = new Error('Your account has been suspended. Please contact support.');
        error.statusCode = 403;
        throw error;
    }

    if (user.security?.twoFactorEnabled) {
        if (!otp) {
            return initiateTwoFactorLogin(user, req, res, emailService.sendLoginOtpEmail);
        }
        if (!verifyTwoFactorOtp(user, otp)) {
            const error = new Error('Invalid or expired OTP');
            error.statusCode = 400;
            throw error;
        }
    }

    user.security = user.security || {};
    user.security.lastLogin = new Date();
    appendLoginHistoryEntry(user, req);
    if (user.firstLogin) {
        user.firstLogin = false;
    }
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    setAuthCookies(res, token, newRefreshToken);

    res.status(200).json({
        success: true,
        data: buildAuthenticatedUserResponse(user),
        token
    });
};

const loginWithAccount = async (req, res) => {
    const { accountNumber, password } = req.body;
    if (!accountNumber || !password) {
        const error = new Error('Please provide account number and password');
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findOne({ accountNumber }).select('+password +security');
    if (!user || !(await user.comparePassword(password))) {
        const error = new Error('Invalid account number or password');
        error.statusCode = 401;
        throw error;
    }

    if (user.status === 'suspended') {
        const error = new Error('Your account has been suspended. Please contact support.');
        error.statusCode = 403;
        throw error;
    }

    user.security = user.security || {};
    user.security.lastLogin = new Date();
    appendLoginHistoryEntry(user, req);
    if (user.firstLogin) {
        user.firstLogin = false;
    }
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    setAuthCookies(res, token, newRefreshToken);

    res.status(200).json({
        success: true,
        data: buildAuthenticatedUserResponse(user),
        token
    });
};

const logout = async (req, res) => {
    const token = req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : req.cookies?.token;
    const refreshTokenStr = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) await blacklistToken(token);
    if (refreshTokenStr) await blacklistToken(refreshTokenStr);

    if (req.user) {
        try {
            const hist = Array.isArray(req.user.clientData?.loginHistory) ? req.user.clientData.loginHistory : [];
            if (hist.length > 0) {
                const lastIdx = hist.length - 1;
                if (!hist[lastIdx].logoutTime) {
                    hist[lastIdx].logoutTime = new Date();
                    hist[lastIdx].lastActiveTime = new Date();
                    req.user.markModified('clientData');
                    await req.user.save({ validateBeforeSave: false });
                }
            }
        } catch {
            // non-blocking
        }
    }

    res.cookie('token', 'none', { expires: new Date(Date.now() + 1000), httpOnly: true });
    res.cookie('refreshToken', 'none', { expires: new Date(Date.now() + 1000), httpOnly: true });
    res.status(200).json({ success: true, message: 'User logged out successfully' });
};

const refreshToken = async (req, res) => {
    const tokenStr = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!tokenStr) {
        const error = new Error('Refresh token not found');
        error.statusCode = 401;
        throw error;
    }

    try {
        const decoded = jwt.verify(tokenStr, getJwtRefreshSecret());
        const user = await User.findById(decoded.id);
        if (!user) {
            res.cookie('token', 'none', { expires: new Date(0), httpOnly: true });
            res.cookie('refreshToken', 'none', { expires: new Date(0), httpOnly: true });
            const error = new Error('User not found');
            error.statusCode = 401;
            throw error;
        }

        const newToken = generateToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);
        setAuthCookies(res, newToken, newRefreshToken);

        res.status(200).json({ success: true, token: newToken });
    } catch (err) {
        res.cookie('token', 'none', { expires: new Date(0), httpOnly: true });
        res.cookie('refreshToken', 'none', { expires: new Date(0), httpOnly: true });
        if (err.statusCode) throw err;
        const error = new Error('Invalid or expired refresh token');
        error.statusCode = 401;
        throw error;
    }
};

module.exports = {
    register: asyncHandler(register),
    login: asyncHandler(login),
    loginWithAccount: asyncHandler(loginWithAccount),
    logout: asyncHandler(logout),
    refreshToken: asyncHandler(refreshToken),
    updatePassword: asyncHandler(passwordService.updatePassword),
    forgotPassword: asyncHandler(passwordService.forgotPassword),
    resetPassword: asyncHandler(passwordService.resetPassword),
    verifyResetToken: asyncHandler(passwordService.verifyResetToken),
    getSecurityQuestionsForReset: asyncHandler(passwordService.getSecurityQuestionsForReset),
    resetPasswordWithSecurityQuestions: asyncHandler(passwordService.resetPasswordWithSecurityQuestions),
    getMe: profileService.getMe,
    updateDetails: profileService.updateDetails
};