const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit', 'transfer'], required: true },
    transferType: { type: String, enum: ['internal', 'external'], default: 'internal' },
    amount: { type: Number, required: true, min: 0.01 },
    balance: { type: Number, required: true },
    description: { type: String, required: true, maxlength: 200 },
    category: { type: String, enum: ['deposit', 'withdrawal', 'transfer', 'bill_payment', 'shopping', 'food', 'transport', 'transportation', 'entertainment', 'utilities', 'salary', 'healthcare', 'investment', 'loan', 'fee', 'interest', 'other'], default: 'other' },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'completed' },
    reference: { type: String, unique: true, sparse: true },
    clientRequestId: { type: String, trim: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipientAccount: String, recipientName: String,
    recipientBank: { bankName: String, ifscCode: String, branchName: String },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
    cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
    investmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment' },
    location: { latitude: Number, longitude: Number, address: String },
    deviceInfo: { userAgent: String, ipAddress: String },
    isRecurring: { type: Boolean, default: false },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringPayment' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

transactionSchema.index({ userId: 1, createdAt: -1 }); transactionSchema.index({ userId: 1, type: 1 }); transactionSchema.index({ userId: 1, category: 1 }); transactionSchema.index({ userId: 1, clientRequestId: 1 }, { unique: true, sparse: true }); transactionSchema.index({ recipientId: 1 }); transactionSchema.index({ status: 1 });

transactionSchema.virtual('formattedAmount').get(function () { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(this.amount); });
transactionSchema.virtual('direction').get(function () { return this.type === 'credit' ? 'received' : 'sent'; });

transactionSchema.pre('save', function (next) {
    if (!this.clientRequestId) this.clientRequestId = `auto_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    if (!this.reference) this.reference = 'TXN' + Date.now() + Math.random().toString(36).substring(2, 7).toUpperCase();
    next();
});

transactionSchema.statics.getUserTransactions = function (userId, options = {}) {
    const { limit = 50, skip = 0, type, category, startDate, endDate } = options;
    const query = { userId, ...(type && { type }), ...(category && { category }), ...((startDate || endDate) && { createdAt: { ...(startDate && { $gte: new Date(startDate) }), ...(endDate && { $lte: new Date(endDate) }) } }) };
    return this.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip).populate('recipientId', 'name accountNumber').populate('billId', 'type amount').populate('investmentId', 'type name');
};

transactionSchema.statics.getTransactionStats = function (userId, period = 'month') {
    const now = new Date();
    const map = { week: new Date(now.getTime() - 7 * 86400000), month: new Date(now.getFullYear(), now.getMonth(), 1), year: new Date(now.getFullYear(), 0, 1), all: new Date('1970-01-01') };
    const startDate = map[period] || map.month;

    return this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
        { $group: { _id: null, totalCredits: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] } }, totalDebits: { $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] } }, transactionCount: { $sum: 1 }, categories: { $push: '$category' } } }
    ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);
