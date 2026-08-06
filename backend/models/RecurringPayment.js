const mongoose = require('mongoose');

const recurringPaymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'User ID is required'] },
    name: { type: String, required: [true, 'Payment name is required'], maxlength: 100 },
    description: { type: String, maxlength: 200 },
    type: { type: String, enum: ['bill_payment', 'subscription', 'loan_payment', 'insurance', 'investment', 'savings', 'other'], required: true },
    amount: { type: Number, required: true, min: 0 },
    frequency: { type: String, enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'], required: true },
    startDate: { type: Date, required: true },
    endDate: Date,
    nextDueDate: { type: Date, required: true },
    fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    toAccount: { type: String, required: true },
    beneficiaryName: { type: String, required: true },
    status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled', 'failed'], default: 'active' },
    isAutoPay: { type: Boolean, default: false },
    paymentHistory: [{
        transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
        amount: Number, date: { type: Date, default: Date.now },
        status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' }, notes: String
    }],
    maxRetries: { type: Number, default: 3 },
    retryCount: { type: Number, default: 0 },
    lastFailureReason: String,
    notifications: { email: { type: Boolean, default: true }, sms: { type: Boolean, default: false }, daysBefore: { type: Number, default: 1 } },
    category: { type: String, enum: ['utilities', 'entertainment', 'insurance', 'loan', 'subscription', 'savings', 'investment', 'rent', 'food', 'transport', 'other'], default: 'other' },
    tags: [String],
    metadata: { billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' }, loanId: String, subscriptionId: String, provider: String }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

recurringPaymentSchema.index({ userId: 1, status: 1 });
recurringPaymentSchema.index({ userId: 1, nextDueDate: 1 });
recurringPaymentSchema.index({ userId: 1, type: 1 });
recurringPaymentSchema.index({ nextDueDate: 1 });

recurringPaymentSchema.virtual('daysUntilNext').get(function () { return Math.ceil((this.nextDueDate - new Date()) / (1000 * 60 * 60 * 24)); });
recurringPaymentSchema.virtual('totalPaymentsMade').get(function () { return this.paymentHistory.filter(p => p.status === 'success').length; });
recurringPaymentSchema.virtual('totalAmountPaid').get(function () { return this.paymentHistory.filter(p => p.status === 'success').reduce((sum, p) => sum + p.amount, 0); });

recurringPaymentSchema.pre('save', function (next) {
    if (!this.nextDueDate) this.nextDueDate = this.startDate;
    if (this.endDate && new Date() > this.endDate) this.status = 'completed';
    next();
});

recurringPaymentSchema.methods.calculateNextDueDate = function () {
    const d = new Date(this.nextDueDate);
    const map = { daily: () => d.setDate(d.getDate() + 1), weekly: () => d.setDate(d.getDate() + 7), 'bi-weekly': () => d.setDate(d.getDate() + 14), monthly: () => d.setMonth(d.getMonth() + 1), quarterly: () => d.setMonth(d.getMonth() + 3), 'half-yearly': () => d.setMonth(d.getMonth() + 6), yearly: () => d.setFullYear(d.getFullYear() + 1) };
    if (map[this.frequency]) map[this.frequency]();
    return d;
};

recurringPaymentSchema.methods.processPayment = async function () {
    try {
        const record = { amount: this.amount, date: new Date(), status: 'success', notes: `Auto payment for ${this.name}` };
        this.paymentHistory.push(record);
        this.nextDueDate = this.calculateNextDueDate();
        this.retryCount = 0;
        this.lastFailureReason = null;
        await this.save();
        return { success: true, payment: record };
    } catch (error) {
        this.retryCount += 1;
        this.lastFailureReason = error.message;
        if (this.retryCount >= this.maxRetries) this.status = 'failed';
        await this.save();
        return { success: false, error: error.message };
    }
};

recurringPaymentSchema.methods.togglePause = function () { this.status = this.status === 'active' ? 'paused' : 'active'; return this.save(); };
recurringPaymentSchema.methods.cancel = function () { this.status = 'cancelled'; return this.save(); };

recurringPaymentSchema.statics.getUserRecurringPayments = function (userId, status = 'active') { return this.find({ userId, status }).sort({ nextDueDate: 1 }); };
recurringPaymentSchema.statics.getPaymentsDueSoon = function (userId, days = 7) {
    const future = new Date(); future.setDate(future.getDate() + days);
    return this.find({ userId, status: 'active', nextDueDate: { $lte: future } }).sort({ nextDueDate: 1 });
};

recurringPaymentSchema.statics.processDuePayments = async function () {
    const due = await this.find({ status: 'active', isAutoPay: true, nextDueDate: { $lte: new Date() } });
    const results = [];
    for (const p of due) results.push({ paymentId: p._id, name: p.name, result: await p.processPayment() });
    return results;
};

recurringPaymentSchema.statics.getPaymentStats = function (userId) {
    return this.aggregate([{ $match: { userId: mongoose.Types.ObjectId(userId) } }, { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }]);
};

module.exports = mongoose.model('RecurringPayment', recurringPaymentSchema);
