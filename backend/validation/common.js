const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const details = errors.array();
        return res.status(400).json({ success: false, error: details.map(err => err.msg).join('; ') || 'Validation failed', details });
    }
    next();
};

const validateObjectId = (paramName = 'id') => [param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`), handleValidationErrors];
const validateEmailAvailabilityQuery = [query('email').isEmail().withMessage('Valid email is required'), handleValidationErrors];
const validatePhoneAvailabilityQuery = [query('phone').isLength({ min: 10, max: 10 }).isNumeric().withMessage('Phone number must be 10 digits'), handleValidationErrors];
const validatePinVerification = [body('pin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN must be 4 to 6 digits'), handleValidationErrors];
const validatePinUpdate = [
    body('currentPin').optional().isLength({ min: 4, max: 6 }).isNumeric().withMessage('Current PIN must be 4 to 6 digits'),
    body('newPin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('New PIN must be 4 to 6 digits'),
    handleValidationErrors
];
const validateProfileUpdate = [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('phone').optional().isLength({ min: 10, max: 10 }).isNumeric().withMessage('Phone number must be 10 digits'),
    body('address').optional().trim().isLength({ max: 200 }).withMessage('Address cannot exceed 200 characters'),
    handleValidationErrors
];
const validateUserStatusUpdate = [body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid user status'), handleValidationErrors];
const validateUserUpdatePayload = [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('phone').optional().isLength({ min: 10, max: 10 }).isNumeric().withMessage('Phone number must be 10 digits'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Invalid user role'),
    body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid user status'),
    handleValidationErrors
];
const validateSettingsPreferencesUpdate = [
    body('theme').optional().isIn(['light', 'dark']).withMessage('Invalid theme'),
    body('notifications.email').optional().isBoolean().withMessage('Must be boolean'),
    body('notifications.push').optional().isBoolean().withMessage('Must be boolean'),
    body('notifications.sms').optional().isBoolean().withMessage('Must be boolean'),
    body('currency').optional().isIn(['INR', 'USD', 'EUR', 'GBP', 'JPY']).withMessage('Invalid currency'),
    handleValidationErrors
];
const validateTwoFactorUpdate = [body('enable').isBoolean().withMessage('Enable must be a boolean value'), handleValidationErrors];
const validateClientDataUpdate = [body().custom(v => { if (!v || Object.keys(v).length === 0) throw new Error('Update payload cannot be empty'); return true; }), handleValidationErrors];
const validateBankPayload = [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Bank name is required'),
    body('description').trim().isLength({ min: 1, max: 500 }).withMessage('Bank description is required'),
    body().custom((_, { req }) => {
        const { bankCode, code, ifscPrefix } = req.body;
        if (!bankCode && !code && !ifscPrefix) throw new Error('Bank code (bankCode, code, or ifscPrefix) is required');
        return true;
    }),
    body('bankCode').optional().trim().isLength({ min: 2, max: 20 }).withMessage('Bank code must be between 2 and 20 characters'),
    body('code').optional().trim().isLength({ min: 2, max: 20 }).withMessage('Code must be between 2 and 20 characters'),
    body('ifscPrefix').optional().trim().isLength({ min: 4, max: 4 }).withMessage('IFSC prefix must be 4 characters'),
    handleValidationErrors
];
const validateCardStatusReviewAction = [body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'), handleValidationErrors];
const validatePagination = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    validateObjectId,
    validateEmailAvailabilityQuery,
    validatePhoneAvailabilityQuery,
    validatePinVerification,
    validatePinUpdate,
    validateProfileUpdate,
    validateUserStatusUpdate,
    validateUserUpdatePayload,
    validateSettingsPreferencesUpdate,
    validateTwoFactorUpdate,
    validateClientDataUpdate,
    validateBankPayload,
    validateCardStatusReviewAction,
    validatePagination
};
