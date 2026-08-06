const Transaction = require('../models/Transaction');
const transactionService = require('../services/transaction.service');
const transferService = require('../services/transfer.service');
const asyncHandler = require('../utils/asyncHandler');

const getTransactions = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { type, category, startDate, endDate } = req.query;
    const options = { limit, skip, type, category, startDate, endDate };

    const transactions = await Transaction.getUserTransactions(req.user._id, options);
    const query = { userId: req.user._id, ...(type && { type }), ...(category && { category }), ...(startDate && endDate && { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }) };
    const total = await Transaction.countDocuments(query);

    res.status(200).json({ success: true, data: transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

const getUserTransactionsAdmin = async (req, res) => {
    if (req.user.role !== 'admin') {
        const error = new Error('Not authorized to access this route');
        error.statusCode = 403;
        throw error;
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const userId = req.params.id;
    const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(limit).skip(skip);
    const total = await Transaction.countDocuments({ userId });
    res.status(200).json({ success: true, data: transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

const getTransaction = async (req, res) => {
    const transaction = await Transaction.findById(req.params.id).populate('recipientId', 'name accountNumber').populate('billId', 'name type').populate('investmentId', 'name type');
    if (!transaction) {
        const error = new Error('Transaction not found');
        error.statusCode = 404;
        throw error;
    }
    if (transaction.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        const error = new Error('Not authorized to view this transaction');
        error.statusCode = 403;
        throw error;
    }
    res.status(200).json({ success: true, data: transaction });
};

const createTransaction = async (req, res) => {
    const result = await transactionService.createTransaction({ userId: req.user._id, body: req.body });
    if (result.duplicateIgnored) {
        return res.status(200).json({ success: true, data: result.existingTransaction, duplicateIgnored: true });
    }
    res.status(201).json({ success: true, data: result.transactionData });
};

const updateTransaction = async (req, res) => {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
        const error = new Error('Transaction not found');
        error.statusCode = 404;
        throw error;
    }
    if (transaction.userId.toString() !== req.user._id.toString()) {
        const error = new Error('Not authorized to update this transaction');
        error.statusCode = 403;
        throw error;
    }

    const updates = {};
    ['description', 'category'].forEach(f => req.body[f] !== undefined && (updates[f] = req.body[f]));
    const updated = await Transaction.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: updated });
};

const deleteTransaction = async (req, res) => {
    await transactionService.deleteTransaction({ userId: req.user._id, transactionId: req.params.id });
    res.status(200).json({ success: true, data: {}, message: 'Transaction deleted successfully' });
};

const getTransactionStats = async (req, res) => {
    const stats = await Transaction.getTransactionStats(req.user._id, req.query.period || 'month');
    res.status(200).json({ success: true, data: stats[0] || { totalCredits: 0, totalDebits: 0, transactionCount: 0, categories: [] } });
};

const getTransactionCategories = async (req, res) => {
    res.status(200).json({ success: true, data: ['deposit', 'withdrawal', 'transfer', 'bill_payment', 'shopping', 'food', 'transport', 'transportation', 'entertainment', 'utilities', 'salary', 'healthcare', 'investment', 'loan', 'fee', 'interest', 'other'] });
};

const validateTransferDetails = async (req, res) => {
    const result = await transferService.validateTransferDetails({ userId: req.user._id, body: req.body });
    res.status(result.statusCode).json(result.body);
};

const transferMoney = async (req, res) => {
    const result = await transferService.transferMoney({ userId: req.user._id, body: req.body });
    res.status(result.statusCode).json(result.body);
};

module.exports = {
    getTransactions: asyncHandler(getTransactions),
    getUserTransactionsAdmin: asyncHandler(getUserTransactionsAdmin),
    getTransaction: asyncHandler(getTransaction),
    createTransaction: asyncHandler(createTransaction),
    updateTransaction: asyncHandler(updateTransaction),
    deleteTransaction: asyncHandler(deleteTransaction),
    getTransactionStats: asyncHandler(getTransactionStats),
    getTransactionCategories: asyncHandler(getTransactionCategories),
    validateTransferDetails: asyncHandler(validateTransferDetails),
    transferMoney: asyncHandler(transferMoney)
};