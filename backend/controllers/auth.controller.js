const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('../services/email');
const { createInAppNotification } = require('../utils/notifications');
const asyncHandler = require('../utils/asyncHandler');
const {
    generateToken,
    generateRefreshToken,
    getJwtRefreshSecret,
    cookieOptions,
    initiateTwoFactorLogin,
    verifyTwoFactorOtp,
    appendLoginHistoryEntry,
    setAuthCookies,
    buildAuthenticatedUserResponse,
    blacklistToken
} = require('../utils/auth');

const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

const findByResetToken = async token => {
    const user = await User.findOne({ 'security.passwordResetToken': hashToken(token) });
    if (!user || !user.security?.passwordResetExpires || user.security.passwordResetExpires < Date.now()) return null;
    return user;
};

const register = async (req, res) => {
    const { name, email, phone, password, pin, bankDetails } = req.body;
    const existing = await User.findOne({ $or: [{ email: email?.toLowerCase() }, { phone }] });
    if (existing) {
        const error = new Error('Email or phone number already registered');
        error.statusCode = 400;
        throw error;
    }

    const user = new User({ name, email, phone, password, pin, bankDetails, balance: 0 });
    await user.save();

    const token = generateToken(user._id);
    const refreshTokenStr = generateRefreshToken(user._id);
    setAuthCookies(res, token, refreshTokenStr);

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
        $or: [{ email: cleanEmail }, { phone: cleanId }, { accountNumber: cleanId }]
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
        if (!otp) return initiateTwoFactorLogin(user, req, res, emailService.sendLoginOtpEmail);
        if (!verifyTwoFactorOtp(user, otp)) {
            const error = new Error('Invalid or expired OTP');
            error.statusCode = 400;
            throw error;
        }
    }

    user.security = user.security || {};
    user.security.lastLogin = new Date();
    appendLoginHistoryEntry(user, req);
    if (user.firstLogin) user.firstLogin = false;
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
    if (user.firstLogin) user.firstLogin = false;
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

const getMe = async (req, res) => {
    res.status(200).json({ success: true, data: await User.findById(req.user._id) });
};

const updateDetails = async (req, res) => {
    const updateData = {};
    if (req.body.address !== undefined) {
        if (typeof req.body.address === 'string') {
            updateData['profile.address.street'] = req.body.address.trim();
        } else if (typeof req.body.address === 'object' && req.body.address !== null) {
            updateData['profile.address'] = req.body.address;
        }
    }
    const raw = {
        name: req.body.name, email: req.body.email, phone: req.body.phone,
        'profile.dateOfBirth': req.body.dateOfBirth, 'profile.occupation': req.body.occupation, 'profile.income': req.body.income,
        'preferences.currency': req.body.currency, 'preferences.theme': req.body.theme,
        'bankDetails.bankName': req.body.bankName, 'bankDetails.ifscCode': req.body.ifscCode, 'bankDetails.branchName': req.body.branchName
    };

    Object.entries(raw).forEach(([k, v]) => { if (v !== undefined) updateData[k] = v; });

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });
    await createInAppNotification({ userId: req.user._id, type: 'account_update', title: 'Profile Updated', message: 'Your profile details were updated successfully.', priority: 'low', metadata: { category: 'settings' } });

    res.status(200).json({ success: true, data: user });
};

const updatePassword = async (req, res) => {
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(req.body.currentPassword))) {
        const error = new Error('Current password is incorrect');
        error.statusCode = 401;
        throw error;
    }

    user.password = req.body.newPassword;
    await user.save();

    await createInAppNotification({ userId: req.user._id, type: 'security_alert', title: 'Password Changed', message: 'Your account password was changed successfully.', priority: 'high', metadata: { category: 'security' } });

    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions);
    res.status(200).json({ success: true, data: { token }, message: 'Password updated successfully' });
};

const forgotPassword = async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return res.status(200).json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

    if (!emailService.isConfigured()) {
        if (process.env.NODE_ENV === 'development') {
            return res.status(200).json({ success: true, message: 'Password reset token generated (development only)', data: resetToken });
        }
        user.security.passwordResetToken = undefined;
        user.security.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        return res.status(500).json({ success: false, error: 'Password reset is temporarily unavailable. Please contact support.' });
    }

    try {
        await emailService.sendPasswordResetEmail(user.email, resetUrl);
        res.status(200).json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch {
        user.security.passwordResetToken = undefined;
        user.security.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        res.status(500).json({ success: false, error: 'Failed to send password reset email. Please try again later.' });
    }
};

const resetPassword = async (req, res) => {
    const user = await findByResetToken(req.params.resettoken);
    if (!user) {
        const error = new Error('Invalid or expired password reset token');
        error.statusCode = 400;
        throw error;
    }

    user.password = req.body.password;
    user.security.passwordResetToken = undefined;
    user.security.passwordResetExpires = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions);
    res.status(200).json({ success: true, data: { token }, message: 'Password reset successful' });
};

const verifyResetToken = async (req, res) => {
    const user = await findByResetToken(req.params.resettoken);
    if (!user) {
        const error = new Error('Invalid or expired password reset token');
        error.statusCode = 400;
        throw error;
    }
    res.status(200).json({ success: true, data: { email: user.email } });
};

const getSecurityQuestionsForReset = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !user.clientData?.securityQuestions?.question1) {
        return res.status(200).json({
            success: true,
            questionsConfigured: false,
            message: 'No security questions configured for this account.'
        });
    }

    return res.status(200).json({
        success: true,
        questionsConfigured: true,
        data: {
            question1: user.clientData.securityQuestions.question1,
            question2: user.clientData.securityQuestions.question2 || ''
        }
    });
};

const resetPasswordWithSecurityQuestions = async (req, res) => {
    const { email, answer1, answer2, newPassword } = req.body;
    if (!email || !answer1 || !newPassword) return res.status(400).json({ success: false, error: 'All fields are required' });
    if (newPassword.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!user || !user.clientData?.securityQuestions?.question1) return res.status(400).json({ success: false, error: 'Security questions not set up for this account' });

    const savedAns1 = (user.clientData.securityQuestions.answer1 || '').trim().toLowerCase();
    const inputAns1 = (answer1 || '').trim().toLowerCase();
    if (savedAns1 !== inputAns1) return res.status(400).json({ success: false, error: 'Answer 1 is incorrect' });

    if (user.clientData.securityQuestions.question2) {
        const savedAns2 = (user.clientData.securityQuestions.answer2 || '').trim().toLowerCase();
        const inputAns2 = (answer2 || '').trim().toLowerCase();
        if (savedAns2 !== inputAns2) return res.status(400).json({ success: false, error: 'Answer 2 is incorrect' });
    }

    user.password = newPassword;
    user.security = user.security || {};
    user.security.passwordResetToken = undefined;
    user.security.passwordResetExpires = undefined;
    await user.save();

    await createInAppNotification({
        userId: user._id, type: 'security_alert', title: 'Password Reset Via Security Questions',
        message: 'Your account password was successfully reset using security questions.',
        priority: 'high', metadata: { category: 'security' }
    });

    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions);
    return res.status(200).json({ success: true, data: { token }, message: 'Password reset successful! You can now log in.' });
};

module.exports = {
    register: asyncHandler(register),
    login: asyncHandler(login),
    loginWithAccount: asyncHandler(loginWithAccount),
    logout: asyncHandler(logout),
    refreshToken: asyncHandler(refreshToken),
    getMe: asyncHandler(getMe),
    updateDetails: asyncHandler(updateDetails),
    updatePassword: asyncHandler(updatePassword),
    forgotPassword: asyncHandler(forgotPassword),
    resetPassword: asyncHandler(resetPassword),
    verifyResetToken: asyncHandler(verifyResetToken),
    getSecurityQuestionsForReset: asyncHandler(getSecurityQuestionsForReset),
    resetPasswordWithSecurityQuestions: asyncHandler(resetPasswordWithSecurityQuestions)
};
