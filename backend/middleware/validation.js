const { body, param, query, validationResult } = require('express-validator');

const TRANSACTION_CATEGORIES = ['deposit', 'withdrawal', 'transfer', 'bill_payment', 'shopping', 'food', 'transport', 'transportation', 'entertainment', 'utilities', 'salary', 'healthcare', 'investment', 'loan', 'fee', 'interest', 'other'];
const BUDGET_CATEGORIES = ['food', 'transport', 'entertainment', 'shopping', 'utilities', 'rent', 'insurance', 'healthcare', 'education', 'savings', 'investment', 'debt_payment', 'miscellaneous', 'other'];
const BILL_TYPES = ['electricity', 'water', 'gas', 'internet', 'phone', 'cable_tv', 'insurance', 'loan', 'credit_card', 'rent', 'property_tax', 'vehicle', 'medical', 'education', 'other'];
const BILL_STATUSES = ['pending', 'paid', 'overdue', 'cancelled'];
const RECURRING_TYPES = ['bill_payment', 'subscription', 'loan_payment', 'insurance', 'investment', 'savings', 'other'];
const RECURRING_FREQUENCIES = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'];
const RECURRING_STATUSES = ['active', 'paused', 'completed', 'cancelled', 'failed'];
const USER_STATUSES = ['active', 'inactive', 'suspended'];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const details = errors.array();
        return res.status(400).json({ success: false, error: details.map(err => err.msg).join('; ') || 'Validation failed', details });
    }
    next();
};

const pwdRule = body => body.isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

const validateUserRegistration = [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters').matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('phone').isLength({ min: 10, max: 10 }).isNumeric().withMessage('Phone number must be 10 digits'),
    pwdRule(body('password')),
    body('pin').optional().isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN must be 4 to 6 digits'),
    handleValidationErrors
];

const validateUserLogin = [
    body().custom((_, { req }) => {
        if (!req.body.identifier && !req.body.email && !req.body.phone) {
            throw new Error('Email or phone is required');
        }
        return true;
    }),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
];

const validatePasswordReset = [body('email').isEmail().withMessage('Please provide a valid email'), handleValidationErrors];
const validatePasswordResetToken = [pwdRule(body('password')), handleValidationErrors];
const validatePasswordUpdate = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    pwdRule(body('newPassword')),
    handleValidationErrors
];

const validateTransaction = [
    body('type').isIn(['credit', 'debit', 'transfer']).withMessage('Invalid transaction type'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('description').trim().isLength({ min: 1, max: 200 }).withMessage('Description is required and must be less than 200 characters'),
    body('category').optional().isIn(TRANSACTION_CATEGORIES).withMessage('Invalid category'),
    body('cardId').optional().isMongoId().withMessage('Invalid card ID'),
    body('clientRequestId').optional().isString().isLength({ min: 8, max: 100 }).withMessage('Invalid client request ID'),
    handleValidationErrors
];

const validateTransfer = [
    body().custom((v, { req }) => {
        if (!req.body.recipientAccount && !req.body.recipientPhone) throw new Error('Either recipient account or phone number is required');
        return true;
    }),
    body('recipientAccount').optional().notEmpty().withMessage('Recipient account cannot be empty'),
    body('recipientPhone').optional().isLength({ min: 10, max: 10 }).isNumeric().withMessage('Phone number must be 10 digits'),
    body('recipientBank').optional().custom(v => { if (v && !v.bankName) throw new Error('Bank name is required for external transfers'); return true; }),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('description').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Description must be less than 200 characters'),
    body('clientRequestId').optional().isString().isLength({ min: 8, max: 100 }).withMessage('Invalid client request ID'),
    handleValidationErrors
];

const validateAccountCreation = [
    body('accountType').isIn(['savings', 'checking', 'business', 'fixed_deposit', 'recurring_deposit']).withMessage('Invalid account type'),
    body('accountName').trim().isLength({ min: 1, max: 50 }).withMessage('Account name is required and must be less than 50 characters'),
    body('currency').optional().isIn(['INR', 'USD', 'EUR', 'GBP', 'JPY']).withMessage('Invalid currency'),
    handleValidationErrors
];

const validateCardCreation = [
    body('cardType').isIn(['debit', 'credit']).withMessage('Invalid card type'),
    body('cardBrand').isIn(['visa', 'mastercard', 'rupay', 'amex']).withMessage('Invalid card brand'),
    body('cardName').trim().isLength({ min: 1, max: 50 }).withMessage('Card name is required'),
    body('accountNumber').optional().notEmpty().withMessage('Account number cannot be empty'),
    body('pin').optional().isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN must be 4 to 6 digits'),
    handleValidationErrors
];

const validateInvestment = [
    body('type').isIn(['mutual_fund', 'fixed_deposit', 'stocks', 'bonds', 'crypto']).withMessage('Invalid investment type'),
    body('amount').isFloat({ min: 100 }).withMessage('Minimum investment amount is 100'),
    body('duration').isInt({ min: 1 }).withMessage('Duration in months is required'),
    handleValidationErrors
];

const validateBudget = [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Budget name is required'),
    body('category').isIn(BUDGET_CATEGORIES).withMessage('Invalid budget category'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('period').isIn(['weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid budget period'),
    body('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    body('year').optional().isInt({ min: 2020, max: 2100 }).withMessage('Invalid year'),
    handleValidationErrors
];

const validateGoal = [
    body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Goal title is required'),
    body('targetAmount').isFloat({ min: 1 }).withMessage('Target amount must be greater than 0'),
    body('targetDate').isISO8601().withMessage('Target date must be a valid date'),
    handleValidationErrors
];

const billRules = (isOpt = false) => {
    const o = f => isOpt ? f.optional() : f;
    return [
        o(body('name').trim().isLength({ min: 1, max: 100 })).withMessage(isOpt ? 'Bill name must be <= 100 chars' : 'Bill name is required'),
        o(body('amount').isFloat({ min: 0.01 })).withMessage('Amount must be greater than 0'),
        o(body('type').isIn(BILL_TYPES)).withMessage('Invalid bill type'),
        body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be <= 200 chars'),
        body('billNumber').optional().isString().trim().isLength({ min: 1, max: 60 }).withMessage('Invalid bill number'),
        body('accountNumber').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('Invalid account number'),
        body('dueDate').optional().isISO8601().withMessage('Invalid due date'),
        body('status').optional().isIn(BILL_STATUSES).withMessage('Invalid bill status'),
        handleValidationErrors
    ];
};

const validateBill = billRules(false);
const validateBillCreate = billRules(false);
const validateBillUpdate = billRules(true);
const validateBillPayment = [body('amount').optional().isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'), handleValidationErrors];

const validateRecurringCreate = [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be <= 100 chars'),
    body('beneficiaryName').trim().isLength({ min: 1, max: 100 }).withMessage('Beneficiary name is required'),
    body('toAccount').isString().trim().isLength({ min: 1, max: 60 }).withMessage('Destination account is required'),
    body('fromAccount').isMongoId().withMessage('Invalid source account'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('frequency').isIn(RECURRING_FREQUENCIES).withMessage('Invalid frequency'),
    body('type').optional().isIn(RECURRING_TYPES).withMessage('Invalid recurring type'),
    body('startDate').isISO8601().withMessage('startDate must be a valid date'),
    body('nextDueDate').optional().isISO8601().withMessage('nextDueDate must be a valid date'),
    body('status').optional().isIn(RECURRING_STATUSES).withMessage('Invalid recurring status'),
    body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be <= 200 chars'),
    handleValidationErrors
];

const validateRecurringUpdate = [
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be <= 100 chars'),
    body('beneficiaryName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Beneficiary name is invalid'),
    body('toAccount').optional().isString().trim().isLength({ min: 1, max: 60 }).withMessage('Destination account is invalid'),
    body('fromAccount').optional().isMongoId().withMessage('Invalid source account'),
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('frequency').optional().isIn(RECURRING_FREQUENCIES).withMessage('Invalid frequency'),
    body('type').optional().isIn(RECURRING_TYPES).withMessage('Invalid recurring type'),
    body('startDate').optional().isISO8601().withMessage('startDate must be a valid date'),
    body('nextDueDate').optional().isISO8601().withMessage('nextDueDate must be a valid date'),
    body('status').optional().isIn(RECURRING_STATUSES).withMessage('Invalid recurring status'),
    body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be <= 200 chars'),
    handleValidationErrors
];

const createValidateObjectId = (paramName = 'id') => [param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`), handleValidationErrors];
const validateObjectId = createValidateObjectId('id');
validateObjectId.forParam = createValidateObjectId;
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

const validateUserStatusUpdate = [body('status').isIn(USER_STATUSES).withMessage('Invalid user status'), handleValidationErrors];
const validateUserUpdatePayload = [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('phone').optional().isLength({ min: 10, max: 10 }).isNumeric().withMessage('Phone number must be 10 digits'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Invalid user role'),
    body('status').optional().isIn(USER_STATUSES).withMessage('Invalid user status'),
    handleValidationErrors
];

const validateSettingsPreferencesUpdate = [
    body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Invalid theme'),
    body('language').optional().isString().withMessage('Invalid language'),
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
    validateUserRegistration, validateUserLogin, validatePasswordReset, validatePasswordResetToken,
    validatePasswordUpdate, validateTransaction, validateTransfer, validateAccountCreation,
    validateCardCreation, validateInvestment, validateBudget, validateGoal, validateBill,
    validateBillCreate, validateBillUpdate, validateBillPayment, validateRecurringCreate,
    validateRecurringUpdate, validateObjectId, validateEmailAvailabilityQuery, validatePhoneAvailabilityQuery,
    validatePinVerification, validatePinUpdate, validateProfileUpdate, validateUserStatusUpdate,
    validateUserUpdatePayload, validateSettingsPreferencesUpdate, validateTwoFactorUpdate,
    validateClientDataUpdate, validateBankPayload, validateCardStatusReviewAction, validatePagination,
    handleValidationErrors
};
