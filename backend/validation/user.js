const { body, validationResult } = require('express-validator');
const { handleValidationErrors } = require('../validation/common');
const { USER_STATUSES } = require('../validation/constants');

const pwdRule = body => body.isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

exports.validateUserRegistration = [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters').matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('phone').isLength({ min: 10, max: 10 }).isNumeric().withMessage('Phone number must be 10 digits'),
    pwdRule(body('password')),
    handleValidationErrors
];

exports.validateUserLogin = [
    body('identifier').notEmpty().withMessage('Email or phone is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
];

exports.validatePasswordReset = [body('email').isEmail().withMessage('Please provide a valid email'), handleValidationErrors];
exports.validatePasswordResetToken = [pwdRule(body('password')), handleValidationErrors];
exports.validatePasswordUpdate = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    pwdRule(body('newPassword')),
    handleValidationErrors
];
exports.validateProfileUpdate = [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters').matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('phone').optional().isLength({ min: 10, max: 10 }).isNumeric().withMessage('Phone number must be 10 digits'),
    body('dateOfBirth').optional().isISO8601().toDate().withMessage('Date of birth must be a valid date'),
    body('address').optional().isLength({ max: 100 }).withMessage('Address must not exceed 100 characters'),
    body('occupation').optional().isLength({ max: 50 }).withMessage('Occupation must not exceed 50 characters'),
    body('income').optional().isFloat({ min: 0 }).withMessage('Income must be a positive number'),
    body('currency').optional().isLength({ max: 3 }).withMessage('Currency code must be 3 characters'),
    body('language').optional().isLength({ max: 2 }).withMessage('Language code must be 2 characters'),
    body('theme').optional().isIn(['light', 'dark']).withMessage('Theme must be either light or dark'),
    body('bankName').optional().isLength({ max: 50 }).withMessage('Bank name must not exceed 50 characters'),
    body('ifscCode').optional().isLength({ max: 11 }).withMessage('IFSC code must not exceed 11 characters'),
    body('branchName').optional().isLength({ max: 50 }).withMessage('Branch name must not exceed 50 characters'),
    handleValidationErrors
];
exports.validateClientDataUpdate = [
    body('securityQuestions').optional().isObject().withMessage('Security questions must be an object'),
    body('loginHistory').optional().isArray().withMessage('Login history must be an array'),
    body('recurringPayments').optional().isArray().withMessage('Recurring payments must be an array'),
    body('budgets').optional().isArray().withMessage('Budgets must be an array'),
    body('investments').optional().isArray().withMessage('Investments must be an array'),
    body('goals').optional().isArray().withMessage('Goals must be an array'),
    body('exchangeCache').optional().isObject().withMessage('Exchange cache must be an object'),
    handleValidationErrors
];
exports.validateUserStatusUpdate = [
    body('status').isIn(USER_STATUSES).withMessage('Status must be either active, inactive, or suspended'),
    handleValidationErrors
];
exports.validatePinVerification = [
    body('pin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN must be 4 to 6 digits'),
    handleValidationErrors
];
exports.validatePinUpdate = [
    body('currentPin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('Current PIN must be 4 to 6 digits'),
    body('newPin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('New PIN must be 4 to 6 digits'),
    handleValidationErrors
];