const express = require('express');
const User = require('../models/User');
const { getUsers, getUser, updateUser, getUserStats, getAdminActions, getBanks, getBankMetrics, getTransferRecipients, getClientData, updateClientData, verifyPin, updatePin, updateProfilePhoto } = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, validatePagination, validateEmailAvailabilityQuery, validatePhoneAvailabilityQuery, validatePinVerification, validatePinUpdate, validateClientDataUpdate, validateUserStatusUpdate, validateUserUpdatePayload } = require('../middleware/validation');
const { apiLimiter, lookupLimiter, pinLimiter, uploadLimiter } = require('../middleware/rateLimit');
const { uploadProfilePhoto } = require('../middleware/upload');

const router = express.Router();

const sanitizeStatusPayload = (req, res, next) => {
    req.body = { status: req.body.status };
    next();
};

router.get('/banks', apiLimiter, getBanks);
router.get('/check-email', lookupLimiter, validateEmailAvailabilityQuery, async (req, res) => {
    try {
        if (!req.query.email) return res.status(400).json({ success: false, error: 'Email is required' });
        res.status(200).json({ exists: Boolean(await User.findOne({ email: String(req.query.email).toLowerCase() })), success: true });
    } catch {
        res.status(500).json({ success: false, error: 'Email check failed' });
    }
});

router.get('/check-phone', lookupLimiter, validatePhoneAvailabilityQuery, async (req, res) => {
    try {
        if (!req.query.phone) return res.status(400).json({ success: false, error: 'Phone is required' });
        const p = await User.checkPhoneAccountLimit(req.query.phone);
        res.status(200).json({ exists: p.count > 0, count: p.count, maxAllowed: p.maxAllowed, canRegister: p.canRegister, success: true });
    } catch {
        res.status(500).json({ success: false, error: 'Phone check failed' });
    }
});

router.use(protect, apiLimiter);

router.post('/verify-pin', pinLimiter, validatePinVerification, verifyPin);
router.put('/update-pin', pinLimiter, validatePinUpdate, updatePin);
router.post('/me/profile-photo', uploadLimiter, uploadProfilePhoto.single('photo'), updateProfilePhoto);
router.get('/me/client-data', getClientData);
router.put('/me/client-data', apiLimiter, validateClientDataUpdate, updateClientData);

router.get('/stats', authorize('admin'), getUserStats);
router.get('/admin-actions', authorize('admin'), getAdminActions);
router.get('/bank-metrics', authorize('admin'), getBankMetrics);
router.get('/transfer-recipients', getTransferRecipients);

router.get('/', authorize('admin'), validatePagination, getUsers);
router.put('/:id/status', authorize('admin'), validateObjectId, validateUserStatusUpdate, sanitizeStatusPayload, updateUser);
router.get('/:id', validateObjectId, getUser);
router.put('/:id', validateObjectId, validateUserUpdatePayload, updateUser);

module.exports = router;