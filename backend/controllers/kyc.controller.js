const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { createInAppNotification } = require('../utils/notifications');
const { KYC_UPLOAD_DIR } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { validateKycIdentity } = require('../utils/kycValidation');

const maskIdNumber = v => {
    if (!v) return '';
    const d = String(v).replace(/\s+/g, '');
    return d.length <= 4 ? `****${d}` : `${'*'.repeat(Math.max(0, d.length - 4))}${d.slice(-4)}`;
};

const submitKyc = async (req, res) => {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files.length) {
        const error = new Error('At least one document image is required');
        error.statusCode = 400;
        throw error;
    }

    const identity = validateKycIdentity(req.body.idType, req.body.idNumber);
    if (!identity.valid) {
        const error = new Error(identity.error);
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const existingDocs = (user.kyc?.documentUrls || []).filter(d => d.startsWith('/uploads/kyc/'));
    for (const d of existingDocs) {
        const p = path.join(KYC_UPLOAD_DIR, path.basename(d));
        try {
            if (fs.existsSync(p)) {
                await fs.promises.unlink(p);
            }
        } catch {
            // Ignore file deletion errors to prevent blocking KYC resubmission
        }
    }

    user.kyc = {
        status: 'pending',
        idType: identity.idType,
        idNumberMasked: maskIdNumber(identity.idNumber),
        documentUrls: files.map(f => `/uploads/kyc/${f.filename}`),
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: ''
    };
    await user.save();

    await createInAppNotification({
        userId: req.user._id,
        type: 'account_update',
        title: 'Verification Submitted',
        message: 'Your verification documents have been submitted for review.',
        priority: 'low',
        metadata: { category: 'kyc' }
    });

    res.status(200).json({ success: true, data: user.kyc });
};

const getKycStatus = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    res.status(200).json({ success: true, data: user.kyc || { status: 'unverified' } });
};

module.exports = {
    submitKyc: asyncHandler(submitKyc),
    getKycStatus: asyncHandler(getKycStatus)
};
