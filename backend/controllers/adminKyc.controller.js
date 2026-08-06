const User = require('../models/User');
const { createInAppNotification } = require('../utils/notifications');
const asyncHandler = require('../utils/asyncHandler');

const listPendingKyc = async (req, res) => {
    const users = await User.find({ 'kyc.status': 'pending' }).select('name email kyc createdAt').sort({ 'kyc.submittedAt': -1 });
    res.status(200).json({ success: true, data: users });
};

const processKycReview = async ({ userId, adminId, status, rejectionReason = '', notifConfig }) => {
    const user = await User.findById(userId);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    user.kyc = {
        ...(user.kyc || {}),
        status,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason
    };
    await user.save();

    await createInAppNotification({
        userId: user._id,
        type: notifConfig.type,
        title: notifConfig.title,
        message: notifConfig.message,
        priority: notifConfig.priority,
        metadata: { category: 'kyc' }
    });

    return user.kyc;
};

const approveKyc = async (req, res) => {
    const kyc = await processKycReview({
        userId: req.params.userId,
        adminId: req.user._id,
        status: 'verified',
        rejectionReason: '',
        notifConfig: {
            type: 'account_update',
            title: 'Verification Approved',
            message: 'Your account verification has been approved.',
            priority: 'medium'
        }
    });
    res.status(200).json({ success: true, data: kyc });
};

const rejectKyc = async (req, res) => {
    const reason = String(req.body.reason || '').trim();
    if (!reason) {
        const error = new Error('Rejection reason is required');
        error.statusCode = 400;
        throw error;
    }

    const kyc = await processKycReview({
        userId: req.params.userId,
        adminId: req.user._id,
        status: 'rejected',
        rejectionReason: reason,
        notifConfig: {
            type: 'security_alert',
            title: 'Verification Rejected',
            message: `Your verification was rejected. Reason: ${reason}`,
            priority: 'high'
        }
    });
    res.status(200).json({ success: true, data: kyc });
};

module.exports = {
    listPendingKyc: asyncHandler(listPendingKyc),
    approveKyc: asyncHandler(approveKyc),
    rejectKyc: asyncHandler(rejectKyc)
};