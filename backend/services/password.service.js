const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('./email');
const { createInAppNotification } = require('../utils/notifications');
const { generateToken, cookieOptions } = require('../helpers/auth.helpers');

const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

const findByResetToken = async token => {
    const user = await User.findOne({ 'security.passwordResetToken': hashToken(token) });
    if (!user || !user.security?.passwordResetExpires || user.security.passwordResetExpires < Date.now()) return null;
    return user;
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
        // Always return 200 OK to prevent email enumeration
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
    } catch (err) {
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
    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }

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
    if (!email || !answer1 || !newPassword) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!user || !user.clientData?.securityQuestions?.question1) {
        return res.status(400).json({ success: false, error: 'Security questions not set up for this account' });
    }

    const savedAns1 = (user.clientData.securityQuestions.answer1 || '').trim().toLowerCase();
    const inputAns1 = (answer1 || '').trim().toLowerCase();

    if (savedAns1 !== inputAns1) {
        return res.status(400).json({ success: false, error: 'Answer 1 is incorrect' });
    }

    if (user.clientData.securityQuestions.question2) {
        const savedAns2 = (user.clientData.securityQuestions.answer2 || '').trim().toLowerCase();
        const inputAns2 = (answer2 || '').trim().toLowerCase();
        if (savedAns2 !== inputAns2) {
            return res.status(400).json({ success: false, error: 'Answer 2 is incorrect' });
        }
    }

    user.password = newPassword;
    user.security = user.security || {};
    user.security.passwordResetToken = undefined;
    user.security.passwordResetExpires = undefined;
    await user.save();

    await createInAppNotification({
        userId: user._id,
        type: 'security_alert',
        title: 'Password Reset Via Security Questions',
        message: 'Your account password was successfully reset using security questions.',
        priority: 'high',
        metadata: { category: 'security' }
    });

    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions);
    return res.status(200).json({
        success: true,
        data: { token },
        message: 'Password reset successful! You can now log in.'
    });
};

module.exports = {
    updatePassword,
    forgotPassword,
    resetPassword,
    verifyResetToken,
    getSecurityQuestionsForReset,
    resetPasswordWithSecurityQuestions
};