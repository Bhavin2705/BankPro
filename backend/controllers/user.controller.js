const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Bank = require('../models/Bank');
const AdminActionLog = require('../models/AdminActionLog');
const { logAdminAction } = require('../utils/adminAudit');
const { createInAppNotification } = require('../utils/notifications');
const fs = require('fs');
const path = require('path');
const { PROFILE_UPLOAD_DIR } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');

const isAdmin = req => req.user?.role === 'admin';
const isSelfOrAdmin = (req, user) => req.user && user && (user._id.toString() === req.user._id.toString() || isAdmin(req));
const VALID_USER_STATUSES = ['active', 'inactive', 'suspended'];

const getBankMetrics = async (req, res) => {
    const accountStats = await Account.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$accountType', totalBalance: { $sum: '$balance' }, averageBalance: { $avg: '$balance' }, count: { $sum: 1 } } }
    ]);
    res.status(200).json({
        success: true,
        data: {
            totalDeposits: accountStats.reduce((sum, acc) => sum + acc.totalBalance, 0),
            accountTypeBreakdown: accountStats
        }
    });
};

const getUsers = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const query = {};

    const search = String(req.query.search || '').trim();
    if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [{ name: regex }, { email: regex }, { phone: regex }, { accountNumber: regex }];
    }
    const status = String(req.query.status || '').trim().toLowerCase();
    if (['active', 'suspended', 'inactive'].includes(status)) query.status = status;
    const role = String(req.query.role || '').trim().toLowerCase();
    if (['user', 'admin'].includes(role)) query.role = role;

    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).limit(limit).skip(skip);
    const total = await User.countDocuments(query);
    res.status(200).json({ success: true, data: users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

const getUser = async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    if (!isSelfOrAdmin(req, user)) {
        const error = new Error('Not authorized');
        error.statusCode = 403;
        throw error;
    }
    res.status(200).json({ success: true, data: user });
};

const updateUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    if (!isSelfOrAdmin(req, user)) {
        const error = new Error('Not authorized');
        error.statusCode = 403;
        throw error;
    }
    if (req.body.role !== undefined) {
        const error = new Error('Role changes are not allowed in admin dashboard');
        error.statusCode = 403;
        throw error;
    }

    const allowed = ['name', 'email', 'phone', 'profile', 'preferences', 'status'];
    if (!isAdmin(req)) allowed.splice(allowed.indexOf('status'), 1);

    const updates = {};
    allowed.forEach(f => req.body[f] !== undefined && (updates[f] = req.body[f]));
    if (Object.keys(updates).length === 0) {
        const error = new Error('No valid fields provided to update');
        error.statusCode = 400;
        throw error;
    }
    if (updates.status !== undefined && !VALID_USER_STATUSES.includes(String(updates.status))) {
        const error = new Error('Invalid user status');
        error.statusCode = 400;
        throw error;
    }

    const previousStatus = user.status;
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
    if (!updatedUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    if (isAdmin(req) && updates.status !== undefined && updates.status !== previousStatus) {
        await logAdminAction(req, {
            action: 'user_status_updated',
            targetType: 'user',
            targetId: String(user._id),
            metadata: { userName: user.name, previousStatus, nextStatus: updates.status }
        });
    }
    res.status(200).json({ success: true, data: updatedUser });
};

const deleteUser = async (req, res) => {
    if (req.user?.role === 'admin') {
        const error = new Error('User deletion is disabled for admin dashboard');
        error.statusCode = 403;
        throw error;
    }
    const user = await User.findById(req.params.id);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    if (user._id.toString() === req.user._id.toString()) {
        const error = new Error('Cannot delete your own account');
        error.statusCode = 400;
        throw error;
    }

    await Transaction.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true });
};

const getUserStats = async (req, res) => {
    const [totalUsers, activeUsers, adminUsers, newUsers] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
    ]);
    res.status(200).json({ success: true, data: { totalUsers, activeUsers, adminUsers, newUsers } });
};

const getAdminActions = async (req, res) => {
    const limitRaw = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
    const actions = await AdminActionLog.find().sort({ createdAt: -1 }).limit(limit).populate('adminId', 'name email role');
    res.status(200).json({ success: true, data: actions });
};

const getBanks = async (req, res) => {
    const banks = await Bank.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: banks });
};

const getTransferRecipients = async (req, res) => {
    const scope = String(req.query.scope || '').toLowerCase();
    let query = { _id: { $ne: req.user._id } };
    if (scope === 'self') {
        const currentUser = await User.findById(req.user._id).select('phone email');
        if (!currentUser) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }
        const ownFilters = [];
        if (currentUser.phone) ownFilters.push({ phone: currentUser.phone });
        if (currentUser.email) ownFilters.push({ email: currentUser.email });
        if (ownFilters.length === 0) return res.status(200).json({ success: true, data: [] });
        query.$or = ownFilters;
    } else {
        query.role = { $ne: 'admin' };
    }
    const recipients = await User.find(query, 'name email phone accountNumber').sort({ name: 1, createdAt: 1 });
    res.status(200).json({ success: true, data: recipients });
};

const getClientData = async (req, res) => {
    const user = await User.findById(req.user._id).select('clientData');
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    res.status(200).json({ success: true, data: user.clientData || {} });
};

const updateClientData = async (req, res) => {
    const allowedSections = ['securityQuestions', 'loginHistory', 'recurringPayments', 'budgets', 'investments', 'goals', 'exchangeCache'];
    const updates = {};
    allowedSections.forEach(section => req.body[section] !== undefined && (updates[`clientData.${section}`] = req.body[section]));
    if (Object.keys(updates).length === 0) {
        const error = new Error('No valid client data fields provided');
        error.statusCode = 400;
        throw error;
    }

    const updated = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true }).select('clientData');
    res.status(200).json({ success: true, data: updated?.clientData || {} });
};

const verifyPin = async (req, res) => {
    const { pin } = req.body;
    if (!pin) {
        const error = new Error('PIN is required');
        error.statusCode = 400;
        throw error;
    }
    const user = await User.findById(req.user.id || req.user._id).select('+pin');
    if (!user || !(await user.comparePin(String(pin)))) {
        const error = new Error(user ? 'Invalid PIN' : 'User not found');
        error.statusCode = user ? 401 : 404;
        throw error;
    }
    res.status(200).json({ success: true, message: 'PIN verified successfully' });
};

const updatePin = async (req, res) => {
    const { currentPin, newPin } = req.body || {};
    if (!currentPin || !newPin) {
        const error = new Error('Current PIN and new PIN are required');
        error.statusCode = 400;
        throw error;
    }
    if (!/^\d{4,6}$/.test(String(newPin))) {
        const error = new Error('New PIN must be 4 to 6 digits');
        error.statusCode = 400;
        throw error;
    }
    const user = await User.findById(req.user.id || req.user._id).select('+pin');
    if (!user || !(await user.comparePin(String(currentPin)))) {
        const error = new Error(user ? 'Current PIN is incorrect' : 'User not found');
        error.statusCode = user ? 401 : 404;
        throw error;
    }

    user.pin = String(newPin);
    await user.save();
    res.status(200).json({ success: true, message: 'Account PIN updated successfully' });
};

const updateProfilePhoto = async (req, res) => {
    if (!req.file) {
        const error = new Error('Profile photo is required');
        error.statusCode = 400;
        throw error;
    }
    const user = await User.findById(req.user._id);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const nextPhotoUrl = `/uploads/profile/${req.file.filename}`;
    if (user.profile?.photoUrl?.startsWith('/uploads/profile/')) {
        const existingPath = path.join(PROFILE_UPLOAD_DIR, path.basename(user.profile.photoUrl));
        try {
            if (fs.existsSync(existingPath)) {
                await fs.promises.unlink(existingPath);
            }
        } catch {
            // Ignore file unlinking error
        }
    }

    user.profile = user.profile || {};
    user.profile.photoUrl = nextPhotoUrl;
    await user.save();

    await createInAppNotification({
        userId: req.user._id,
        type: 'account_update',
        title: 'Profile Photo Updated',
        message: 'Your profile photo was updated successfully.',
        priority: 'low',
        metadata: { category: 'settings' }
    });
    res.status(200).json({ success: true, data: user });
};

const disableUserTwoFactor = async (req, res) => {
    if (!isAdmin(req)) {
        const error = new Error('Admin authorization required');
        error.statusCode = 403;
        throw error;
    }
    const user = await User.findById(req.params.id);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    user.security = {
        ...(user.security || {}),
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorOtpHash: null,
        twoFactorOtpExpires: null
    };
    await user.save({ validateBeforeSave: false });

    await logAdminAction(req, 'DISABLE_2FA', 'User', user._id, { email: user.email });

    res.status(200).json({
        success: true,
        message: `Two-factor authentication disabled for ${user.name}`,
        data: { _id: user._id, twoFactorEnabled: false }
    });
};

module.exports = {
    getUsers: asyncHandler(getUsers),
    getUser: asyncHandler(getUser),
    updateUser: asyncHandler(updateUser),
    deleteUser: asyncHandler(deleteUser),
    getUserStats: asyncHandler(getUserStats),
    getAdminActions: asyncHandler(getAdminActions),
    getBanks: asyncHandler(getBanks),
    getBankMetrics: asyncHandler(getBankMetrics),
    getTransferRecipients: asyncHandler(getTransferRecipients),
    getClientData: asyncHandler(getClientData),
    updateClientData: asyncHandler(updateClientData),
    verifyPin: asyncHandler(verifyPin),
    updatePin: asyncHandler(updatePin),
    updateProfilePhoto: asyncHandler(updateProfilePhoto),
    disableUserTwoFactor: asyncHandler(disableUserTwoFactor)
};