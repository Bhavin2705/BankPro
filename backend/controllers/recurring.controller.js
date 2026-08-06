const RecurringPayment = require('../models/RecurringPayment');
const asyncHandler = require('../utils/asyncHandler');

const getRecurringPayments = async (req, res) => {
    const data = await RecurringPayment.find({ userId: req.user._id });
    res.json({ success: true, data: data });
};

const createRecurringPayment = async (req, res) => {
    const { name, beneficiaryName, toAccount, fromAccount, amount, frequency, type, startDate, nextDueDate, description } = req.body;
    const data = await RecurringPayment.create({ userId: req.user._id, name, beneficiaryName, toAccount, fromAccount, amount, frequency, type, startDate, nextDueDate, description });
    res.status(201).json({ success: true, data: data });
};

const updateRecurringPayment = async (req, res) => {
    const payment = await RecurringPayment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!payment) {
        const error = new Error('Recurring payment not found');
        error.statusCode = 404;
        throw error;
    }
    const allowed = ['name', 'beneficiaryName', 'toAccount', 'fromAccount', 'amount', 'frequency', 'type', 'startDate', 'nextDueDate', 'description'];
    allowed.forEach(field => { if (req.body[field] !== undefined) payment[field] = req.body[field]; });
    await payment.save();
    res.json({ success: true, data: payment });
};

const deleteRecurringPayment = async (req, res) => {
    const payment = await RecurringPayment.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!payment) {
        const error = new Error('Recurring payment not found');
        error.statusCode = 404;
        throw error;
    }
    res.json({ success: true, data: payment });
};

module.exports = {
    getRecurringPayments: asyncHandler(getRecurringPayments),
    createRecurringPayment: asyncHandler(createRecurringPayment),
    updateRecurringPayment: asyncHandler(updateRecurringPayment),
    deleteRecurringPayment: asyncHandler(deleteRecurringPayment)
};