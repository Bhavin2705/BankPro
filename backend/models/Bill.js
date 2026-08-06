const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['electricity', 'water', 'gas', 'internet', 'phone', 'cable_tv', 'insurance', 'loan', 'credit_card', 'rent', 'property_tax', 'vehicle', 'medical', 'education', 'other'], required: true },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 200 },
    billNumber: { type: String, required: true },
    accountNumber: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'paid', 'overdue', 'cancelled'], default: 'pending' },
    paidAmount: { type: Number, default: 0 },
    paidDate: Date,
    paymentMethod: { type: String, enum: ['online', 'auto_debit', 'manual', 'cheque'] },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    isRecurring: { type: Boolean, default: false },
    frequency: { type: String, enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'], default: 'monthly' },
    nextDueDate: Date,
    autoPay: { type: Boolean, default: false },
    autoPayAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    provider: { name: String, contact: String, website: String, customerId: String },
    reminders: { email: { type: Boolean, default: true }, sms: { type: Boolean, default: false }, daysBefore: { type: Number, default: 3 } },
    documents: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
    notes: [{ content: String, date: { type: Date, default: Date.now } }]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

billSchema.index({ userId: 1, status: 1 }); billSchema.index({ userId: 1, dueDate: 1 }); billSchema.index({ userId: 1, type: 1 }); billSchema.index({ billNumber: 1 });

billSchema.virtual('daysUntilDue').get(function () { return Math.ceil((this.dueDate - new Date()) / (1000 * 60 * 60 * 24)); });
billSchema.virtual('isOverdue').get(function () { return this.status === 'pending' && this.daysUntilDue < 0; });
billSchema.virtual('paymentStatus').get(function () {
    if (this.status === 'paid') return 'paid';
    if (this.isOverdue) return 'overdue';
    return this.daysUntilDue <= this.reminders.daysBefore ? 'due_soon' : 'pending';
});

billSchema.pre('save', function (next) {
    if (this.isRecurring && !this.nextDueDate) this.nextDueDate = this.dueDate;
    if (this.paidAmount >= this.amount && this.status === 'pending') { this.status = 'paid'; this.paidDate = new Date(); }
    next();
});

billSchema.methods.markAsPaid = function (paymentAmount, paymentMethod = 'online', transactionId = null) {
    this.paidAmount = paymentAmount; this.status = 'paid'; this.paidDate = new Date(); this.paymentMethod = paymentMethod;
    if (transactionId) this.transactionId = transactionId;
    this.notes.push({ content: `Bill paid: Rs ${paymentAmount.toLocaleString('en-IN')} via ${paymentMethod}` });
    return this.isRecurring ? this.createNextBill() : this.save();
};

billSchema.methods.createNextBill = function () {
    return new (mongoose.model('Bill'))({
        userId: this.userId, type: this.type, name: this.name, description: this.description, billNumber: this.generateNextBillNumber(),
        accountNumber: this.accountNumber, amount: this.amount, dueDate: this.calculateNextDueDate(), isRecurring: true,
        frequency: this.frequency, autoPay: this.autoPay, autoPayAccount: this.autoPayAccount, provider: this.provider, reminders: this.reminders
    }).save();
};

billSchema.methods.generateNextBillNumber = function () {
    const now = new Date(); return `${this.billNumber.split('-')[0]}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
};

billSchema.methods.calculateNextDueDate = function () {
    const d = new Date(this.dueDate);
    const m = { monthly: 1, quarterly: 3, 'half-yearly': 6, yearly: 12 };
    if (this.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + (m[this.frequency] || 1));
    return d;
};

billSchema.statics.getUserBills = function (userId, status = 'all') { return this.find({ userId, ...(status !== 'all' && { status }) }).sort({ dueDate: 1 }); };
billSchema.statics.getBillsDueSoon = function (userId, days = 7) {
    const f = new Date(); f.setDate(f.getDate() + days);
    return this.find({ userId, status: 'pending', dueDate: { $lte: f } }).sort({ dueDate: 1 });
};
billSchema.statics.getBillStats = function (userId) {
    return this.aggregate([{ $match: { userId: mongoose.Types.ObjectId(userId) } }, { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' }, paidAmount: { $sum: '$paidAmount' } } }]);
};

module.exports = mongoose.model('Bill', billSchema);
