const User = require('../models/User');
const Card = require('../models/Card');
const { createInAppNotification } = require('../utils/notifications');
const asyncHandler = require('../utils/asyncHandler');

const getSettings = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    res.status(200).json({
        success: true,
        data: {
            profile: { name: user.name, email: user.email, phone: user.phone, photoUrl: user.profile?.photoUrl, dateOfBirth: user.profile?.dateOfBirth, address: user.profile?.address, occupation: user.profile?.occupation, income: user.profile?.income },
            bank: { bankName: user.bankDetails?.bankName, ifscCode: user.bankDetails?.ifscCode, branchName: user.bankDetails?.branchName, accountNumber: user.accountNumber },
            security: { isEmailVerified: user.security?.isEmailVerified, isPhoneVerified: user.security?.isPhoneVerified, twoFactorEnabled: user.security?.twoFactorEnabled, lastLogin: user.security?.lastLogin },
            kyc: { status: user.kyc?.status || 'unverified', idType: user.kyc?.idType, idNumberMasked: user.kyc?.idNumberMasked, documentUrls: user.kyc?.documentUrls, submittedAt: user.kyc?.submittedAt, reviewedAt: user.kyc?.reviewedAt, rejectionReason: user.kyc?.rejectionReason },
            preferences: { currency: user.preferences?.currency || 'INR', language: user.preferences?.language || 'en', theme: user.preferences?.theme || 'light', notifications: { email: user.preferences?.notifications?.email !== false, sms: user.preferences?.notifications?.sms !== false, push: user.preferences?.notifications?.push !== false } }
        }
    });
};

const updatePreferences = async (req, res) => {
    // Isolated payload extraction: ignore all other injected payload parameters (like isAdmin, userId, role, etc.)
    const { emailNotifications, smsNotifications, pushNotifications, theme, currency, language, notifications } = req.body || {};
    const updateData = {};

    // String De-contamination: append .trim() to string inputs
    if (typeof currency === 'string' && currency.trim()) {
        updateData['preferences.currency'] = currency.trim();
    }
    if (typeof language === 'string' && language.trim()) {
        updateData['preferences.language'] = language.trim();
    }
    if (typeof theme === 'string' && theme.trim()) {
        updateData['preferences.theme'] = theme.trim();
    }

    // Boundary Validation & Type Safety: strictly verify notification preference flags are boolean values
    const emailPref = typeof emailNotifications === 'boolean'
        ? emailNotifications
        : typeof notifications?.email === 'boolean'
            ? notifications.email
            : undefined;

    const smsPref = typeof smsNotifications === 'boolean'
        ? smsNotifications
        : typeof notifications?.sms === 'boolean'
            ? notifications.sms
            : undefined;

    const pushPref = typeof pushNotifications === 'boolean'
        ? pushNotifications
        : typeof notifications?.push === 'boolean'
            ? notifications.push
            : undefined;

    if (emailPref !== undefined) updateData['preferences.notifications.email'] = emailPref;
    if (smsPref !== undefined) updateData['preferences.notifications.sms'] = smsPref;
    if (pushPref !== undefined) updateData['preferences.notifications.push'] = pushPref;

    // Audit Trail Tracking: assign database save resolution metrics to explicit local variables
    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });
    
    await createInAppNotification({
        userId: req.user._id,
        type: 'account_update',
        title: 'Preferences Updated',
        message: 'Your notification or display preferences were updated.',
        priority: 'low',
        metadata: { category: 'settings' }
    });

    const userPreferences = updatedUser ? updatedUser.preferences : {};
    const responsePayload = {
        success: true,
        data: userPreferences,
        message: 'Preferences updated successfully'
    };

    res.status(200).json(responsePayload);
};

const updateTwoFactor = async (req, res) => {
    const { enable } = req.body;
    const updateData = { 'security.twoFactorEnabled': !!enable };
    if (!enable) {
        updateData['security.twoFactorSecret'] = null;
        updateData['security.twoFactorOtpHash'] = null;
        updateData['security.twoFactorOtpExpires'] = null;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });
    await createInAppNotification({ userId: req.user._id, type: 'security_alert', title: 'Two-Factor Authentication Updated', message: `Two-factor authentication was ${enable ? 'enabled' : 'disabled'} on your account.`, priority: 'high', metadata: { category: 'security' } });
    res.status(200).json({ success: true, data: { twoFactorEnabled: user.security?.twoFactorEnabled }, message: `Two-factor authentication ${enable ? 'enabled' : 'disabled'} successfully` });
};

const getLinkedAccounts = async (req, res) => {
    const data = await Card.find({ userId: req.user._id }).select('-cvv');
    res.status(200).json({ success: true, data: data });
};

const getSessions = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    res.status(200).json({ success: true, data: { lastLogin: user.security?.lastLogin, accountCreated: user.createdAt, accountAge: Math.floor((Date.now() - user.createdAt) / 86400000), currentSession: new Date() } });
};

module.exports = {
    getSettings: asyncHandler(getSettings),
    updatePreferences: asyncHandler(updatePreferences),
    updateTwoFactor: asyncHandler(updateTwoFactor),
    getLinkedAccounts: asyncHandler(getLinkedAccounts),
    getSessions: asyncHandler(getSessions)
};