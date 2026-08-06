const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { roundTwo } = require('../helpers/transaction.helpers');
const asyncHandler = require('../utils/asyncHandler');

const applyStatus = (b) => {
    // Never auto-flip a finalized budget
    if (b.status === 'completed' || b.status === 'cancelled') return;
    if (b.spent > b.amount) b.status = 'over_budget';
    else if (b.status === 'over_budget') b.status = 'active';
};

const getBudgets = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const query = { userId: req.user._id, ...(req.query.status && { status: req.query.status }) };
    const budgets = await Budget.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Budget.countDocuments(query);
    res.status(200).json({ success: true, data: budgets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

const getBudget = async (req, res) => {
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
    if (!budget) {
        const error = new Error('Budget not found');
        error.statusCode = 404;
        throw error;
    }
    res.status(200).json({ success: true, data: budget });
};

const getBudgetSummary = async (req, res) => {
    const summary = await Budget.aggregate([
        { $match: { userId: req.user._id, status: 'active' } },
        { $group: { _id: null, totalBudget: { $sum: '$amount' }, totalSpent: { $sum: '$spent' }, budgetCount: { $sum: 1 }, overBudgetCount: { $sum: { $cond: [{ $gte: ['$spent', '$amount'] }, 1, 0] } } } }
    ]);
    res.status(200).json({ success: true, data: summary[0] || { totalBudget: 0, totalSpent: 0, budgetCount: 0, overBudgetCount: 0 } });
};

const createBudget = async (req, res) => {
    const { name, category, amount, period } = req.body;
    const numAmount = roundTwo(Number(amount));
    if (!name?.trim() || !category || !Number.isFinite(numAmount) || numAmount <= 0) {
        const error = new Error('Valid name, category, and positive amount are required');
        error.statusCode = 400;
        throw error;
    }

    const budget = await Budget.create({ userId: req.user._id, name: name.trim(), category, amount: numAmount, period: period || 'monthly', status: 'active', spent: 0 });
    res.status(201).json({ success: true, data: budget });
};

const updateBudget = async (req, res) => {
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
    if (!budget) {
        const error = new Error('Budget not found');
        error.statusCode = 404;
        throw error;
    }

    ['name', 'amount', 'period', 'status'].forEach(f => {
        if (req.body[f] !== undefined) {
            budget[f] = f === 'amount' ? roundTwo(Number(req.body[f])) : req.body[f];
        }
    });
    applyStatus(budget);
    await budget.save();
    res.status(200).json({ success: true, data: budget });
};

const deleteBudget = async (req, res) => {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!budget) {
        const error = new Error('Budget not found');
        error.statusCode = 404;
        throw error;
    }
    res.status(200).json({ success: true, message: 'Budget deleted successfully' });
};

const updateBudgetSpent = async (req, res) => {
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
    if (!budget) {
        const error = new Error('Budget not found');
        error.statusCode = 404;
        throw error;
    }

    const dateFilter = {};
    if (budget.startDate) dateFilter.$gte = budget.startDate;
    if (budget.endDate) dateFilter.$lte = budget.endDate;
    const txQuery = { userId: req.user._id, category: budget.category, type: 'debit' };
    if (budget.startDate || budget.endDate) txQuery.createdAt = dateFilter;
    const transactions = await Transaction.find(txQuery);
    budget.spent = roundTwo(transactions.reduce((sum, t) => sum + (t.amount || 0), 0));
    applyStatus(budget);
    await budget.save();
    res.status(200).json({ success: true, data: budget });
};

const getBudgetStats = async (req, res) => {
    const [stats, categoryStats] = await Promise.all([
        Budget.aggregate([{ $match: { userId: req.user._id } }, { $group: { _id: '$status', count: { $sum: 1 }, totalBudget: { $sum: '$amount' }, totalSpent: { $sum: '$spent' } } }]),
        Budget.aggregate([{ $match: { userId: req.user._id, status: 'active' } }, { $group: { _id: '$category', amount: { $sum: '$amount' }, spent: { $sum: '$spent' } } }])
    ]);
    res.status(200).json({ success: true, data: { byStatus: stats, byCategory: categoryStats } });
};

module.exports = {
    getBudgets: asyncHandler(getBudgets),
    getBudget: asyncHandler(getBudget),
    getBudgetSummary: asyncHandler(getBudgetSummary),
    createBudget: asyncHandler(createBudget),
    updateBudget: asyncHandler(updateBudget),
    deleteBudget: asyncHandler(deleteBudget),
    updateBudgetSpent: asyncHandler(updateBudgetSpent),
    getBudgetStats: asyncHandler(getBudgetStats)
};