const { body, validationResult } = require('express-validator');
const { handleValidationErrors } = require('../validation/common');
const {
    USER_STATUSES,
    TRANSACTION_CATEGORIES,
    BUDGET_CATEGORIES,
    BILL_TYPES,
    BILL_STATUSES,
    RECURRING_TYPES,
    RECURRING_FREQUENCIES,
    RECURRING_STATUSES
} = require('../validation/constants');

exports.validateTransaction = [
    body('type').isIn(['credit', 'debit', 'transfer']).withMessage('Invalid transaction type'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('description').trim().isLength({ min: 1, max: 200 }).withMessage('Description is required and must be less than 200 characters'),
    body('category').optional().isIn(TRANSACTION_CATEGORIES).withMessage('Invalid category'),
    body('cardId').optional().isMongoId().withMessage('Invalid card ID'),
    body('clientRequestId').optional().isString().isLength({ min: 8, max: 100 }).withMessage('Invalid client request ID'),
    handleValidationErrors
];

exports.validateTransfer = [
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

exports.validateAccountCreation = [
    body('accountType').isIn(['savings', 'checking', 'business', 'fixed_deposit', 'recurring_deposit']).withMessage('Invalid account type'),
    body('accountName').trim().isLength({ min: 1, max: 50 }).withMessage('Account name is required and must be less than 50 characters'),
    body('currency').optional().isIn(['INR', 'USD', 'EUR', 'GBP', 'JPY']).withMessage('Invalid currency'),
    handleValidationErrors
];

exports.validateCardCreation = [
    body('cardType').isIn(['debit', 'credit']).withMessage('Invalid card type'),
    body('cardBrand').isIn(['visa', 'mastercard', 'rupay', 'amex']).withMessage('Invalid card brand'),
    body('cardName').trim().isLength({ min: 1, max: 50 }).withMessage('Card name is required'),
    body('accountNumber').optional().notEmpty().withMessage('Account number cannot be empty'),
    body('pin').optional().isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN must be 4 to 6 digits'),
    handleValidationErrors
];

exports.validateInvestment = [
    body('type').isIn(['mutual_fund', 'fixed_deposit', 'stocks', 'bonds', 'crypto']).withMessage('Invalid investment type'),
    body('amount').isFloat({ min: 100 }).withMessage('Minimum investment amount is 100'),
    body('duration').isInt({ min: 1 }).withMessage('Duration in months is required'),
    handleValidationErrors
];

exports.validateBudget = [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Budget name is required'),
    body('category').isIn(BUDGET_CATEGORIES).withMessage('Invalid budget category'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('period').isIn(['weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid budget period'),
    body('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    body('year').optional().isInt({ min: 2020, max: 2100 }).withMessage('Invalid year'),
    handleValidationErrors
];

exports.validateGoal = [
    body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Goal title is required'),
    body('targetAmount').isFloat({ min: 1 }).withMessage('Target amount must be greater than 0'),
    body('targetDate').isISO8601().withMessage('Target date must be a valid date'),
    handleValidationErrors
];