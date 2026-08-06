const Bill = require('../models/Bill');
const Transaction = require('../models/Transaction');
const emailService = require('../services/email');
const { createInAppNotification } = require('../utils/notifications');
const { roundTwo } = require('../helpers/transaction.helpers');
const asyncHandler = require('../utils/asyncHandler');

const getBills = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const query = { userId: req.user._id, ...(req.query.status && { status: req.query.status }) };
    const bills = await Bill.find(query).sort({ dueDate: 1 }).skip(skip).limit(limit);
    const total = await Bill.countDocuments(query);
    res.status(200).json({ success: true, data: bills, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

const getBill = async (req, res) => {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bill) {
        const error = new Error('Bill not found');
        error.statusCode = 404;
        throw error;
    }
    res.status(200).json({ success: true, data: bill });
};

const createBill = async (req, res) => {
    const { name, amount, category, type, description, billNumber, accountNumber, dueDate, status } = req.body;
    if (!name?.trim()) {
        const error = new Error('Bill name is required');
        error.statusCode = 400;
        throw error;
    }
    const numericAmount = roundTwo(Number(amount));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        const error = new Error('Valid positive amount is required');
        error.statusCode = 400;
        throw error;
    }

    const bill = await Bill.create({
        userId: req.user._id,
        type: category || type || 'other',
        name: name.trim(),
        description: description || '',
        billNumber: billNumber || `BILL-${Date.now()}`,
        accountNumber: accountNumber || req.user._id.toString().slice(-8),
        amount: numericAmount,
        dueDate: dueDate || new Date(),
        status: 'pending'   // always pending on create — never trust client-supplied status
    });
    res.status(201).json({ success: true, data: bill });
};

const updateBill = async (req, res) => {
    const { name, dueDate, category, type, amount, description, status } = req.body;
    const cleanBody = {};
    if (name !== undefined) cleanBody.name = name;
    if (dueDate !== undefined) cleanBody.dueDate = dueDate;
    if (category !== undefined) cleanBody.type = category;
    if (type !== undefined) cleanBody.type = type;
    if (amount !== undefined) cleanBody.amount = roundTwo(Number(amount));
    if (description !== undefined) cleanBody.description = description;
    if (status !== undefined && ['pending', 'overdue', 'cancelled'].includes(status)) cleanBody.status = status;
    const bill = await Bill.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, cleanBody, { new: true, runValidators: true });
    if (!bill) {
        const error = new Error('Bill not found');
        error.statusCode = 404;
        throw error;
    }
    res.status(200).json({ success: true, data: bill });
};

const deleteBill = async (req, res) => {
    const bill = await Bill.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!bill) {
        const error = new Error('Bill not found');
        error.statusCode = 404;
        throw error;
    }
    res.status(200).json({ success: true, message: 'Bill deleted successfully' });
};

const payBill = async (req, res) => {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bill) {
        const error = new Error('Bill not found');
        error.statusCode = 404;
        throw error;
    }
    if (bill.status === 'paid') {
        const error = new Error('Bill already paid');
        error.statusCode = 400;
        throw error;
    }

    const paymentAmount = roundTwo(Number(req.body.amount || bill.amount));
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        const error = new Error('Payment amount must be positive');
        error.statusCode = 400;
        throw error;
    }

    // Re-fetch user fresh from DB to avoid stale balance
    const User = require('../models/User');
    const freshUser = await User.findById(req.user._id);
    if (!freshUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    if (paymentAmount > freshUser.balance) {
        const error = new Error('Insufficient balance for bill payment');
        error.statusCode = 400;
        throw error;
    }

    const newBalance = roundTwo(freshUser.balance - paymentAmount);
    const reference = `BILLPAY-${bill._id}-${Date.now()}`;

    // Lock the bill as paid FIRST — if anything after this fails the bill stays paid
    // and the user gets an error they can report, rather than being double-charged.
    bill.status = 'paid';
    bill.paidAmount = roundTwo((bill.paidAmount || 0) + paymentAmount);
    bill.paidDate = new Date();
    await bill.save();

    let transaction;
    try {
        transaction = await Transaction.create({
            userId: freshUser._id,
            type: 'debit',
            amount: paymentAmount,
            balance: newBalance,
            description: `Payment for ${bill.name}`,
            category: 'bill_payment',
            status: 'completed',
            billId: bill._id,
            reference
        });
    } catch (txErr) {
        // Transaction write failed — roll bill back to pending so user can retry
        bill.status = 'pending';
        bill.paidAmount = roundTwo((bill.paidAmount || 0) - paymentAmount);
        bill.paidDate = undefined;
        await bill.save().catch(() => {});
        const error = new Error('Payment ledger entry failed. Please try again.');
        error.statusCode = 500;
        throw error;
    }

    // Wire transaction id onto bill record
    bill.transactionId = transaction._id;
    await bill.save().catch(() => {});

    freshUser.balance = newBalance;
    await freshUser.save({ validateBeforeSave: false });

    if (freshUser?.preferences?.notifications?.email !== false) {
        emailService.sendBillPaymentNotification(freshUser.email, {
            billName: bill.name,
            amount: paymentAmount,
            currency: 'INR',
            referenceNumber: reference,
            date: new Date()
        });
    }

    await createInAppNotification({
        userId: freshUser._id,
        type: 'bill_paid',
        title: 'Bill Paid Successfully',
        message: `${bill.name} bill paid for Rs ${paymentAmount.toLocaleString('en-IN')}.`,
        priority: 'medium',
        relatedId: bill._id,
        relatedModel: 'Bill',
        metadata: { amount: paymentAmount, category: 'bill_payment' }
    });

    res.status(200).json({ success: true, message: 'Bill paid successfully', data: { bill, transaction } });
};

const getBillStats = async (req, res) => {
    const [totalBills, pendingBills, paidBills, overdueBills, stats] = await Promise.all([
        Bill.countDocuments({ userId: req.user._id }),
        Bill.countDocuments({ userId: req.user._id, status: 'pending' }),
        Bill.countDocuments({ userId: req.user._id, status: 'paid' }),
        Bill.countDocuments({ userId: req.user._id, status: 'overdue', dueDate: { $lt: new Date() } }),
        Bill.aggregate([
            { $match: { userId: req.user._id } },
            { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
        ])
    ]);

    res.status(200).json({ success: true, data: { totalBills, pendingBills, paidBills, overdueBills, statsByStatus: stats } });
};

module.exports = {
    getBills: asyncHandler(getBills),
    getBill: asyncHandler(getBill),
    createBill: asyncHandler(createBill),
    updateBill: asyncHandler(updateBill),
    deleteBill: asyncHandler(deleteBill),
    payBill: asyncHandler(payBill),
    getBillStats: asyncHandler(getBillStats)
};