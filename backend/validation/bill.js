const { body, validationResult } = require('express-validator');
const { handleValidationErrors } = require('../validation/common');
const { BILL_TYPES, BILL_STATUSES } = require('../validation/constants');

const billRules = (isOpt = false) => {
    const f => isOpt ? f.optional() : f;
    return [
        f(body('name').trim().isLength({ min: 1, max: 100 })).withMessage(isOpt ? 'Bill name must be <= 100 chars' : 'Bill name is required'),
        f(body('amount').isFloat({ min: 0.01 })).withMessage('Amount must be greater than 0'),
        f(body('type').isIn(BILL_TYPES)).withMessage('Invalid bill type'),
        body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be <= 200 chars'),
        body('billNumber').optional().isString().trim().isLength({ min: 1, max: 60 }).withMessage('Invalid bill number'),
        body('accountNumber').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('Invalid account number'),
        body('dueDate').optional().isISO8601().withMessage('Invalid due date'),
        body('status').optional().isIn(BILL_STATUSES).withMessage('Invalid bill status'),
        handleValidationErrors
    ];
};

exports.validateBill = billRules(false);
exports.validateBillCreate = billRules(false);
exports.validateBillUpdate = billRules(true);
exports.validateBillPayment = [body('amount').optional().isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'), handleValidationErrors];