const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    accountNumber: { type: String, required: true, unique: true },
    accountType: { type: String, enum: ['savings', 'checking', 'business', 'fixed_deposit', 'recurring_deposit'], required: true },
    accountName: { type: String, required: true, maxlength: 50, validate: { validator: v => /^[A-Za-z0-9 ]+$/.test(v), message: 'Account name must not contain special characters.' } },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR', enum: ['INR', 'USD', 'EUR', 'GBP', 'JPY'] },
    status: { type: String, enum: ['active', 'inactive', 'frozen', 'closed'], default: 'active' },
    fixedDeposit: { principal: Number, interestRate: Number, maturityDate: Date, maturityAmount: Number, isMatured: { type: Boolean, default: false } },
    recurringDeposit: { monthlyDeposit: Number, interestRate: Number, maturityDate: Date, maturityAmount: Number, isMatured: { type: Boolean, default: false } },
    limits: { dailyWithdrawal: { type: Number, default: 50000 }, monthlyWithdrawal: { type: Number, default: 500000 }, dailyTransfer: { type: Number, default: 100000 }, monthlyTransfer: { type: Number, default: 1000000 } },
    features: { onlineBanking: { type: Boolean, default: true }, mobileBanking: { type: Boolean, default: true }, atmCard: { type: Boolean, default: true }, chequeBook: { type: Boolean, default: false }, internetBanking: { type: Boolean, default: true } },
    branch: { name: String, code: String, address: String, phone: String }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

accountSchema.index({ userId: 1 }); accountSchema.index({ accountType: 1 }); accountSchema.index({ status: 1 });

accountSchema.virtual('accountAge').get(function () { return Math.floor((Date.now() - this.createdAt) / 86400000); });
accountSchema.virtual('availableBalance').get(function () { return this.balance; });

accountSchema.pre('save', function (next) {
    if (!this.accountNumber) {
        this.accountNumber = this.accountType.substring(0, 2).toUpperCase() + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 4).toUpperCase();
    }
    next();
});

accountSchema.methods.canWithdraw = function (amt, period = 'daily') { return period === 'daily' ? amt <= this.limits.dailyWithdrawal : period === 'monthly' ? amt <= this.limits.monthlyWithdrawal : false; };
accountSchema.methods.canTransfer = function (amt, period = 'daily') { return period === 'daily' ? amt <= this.limits.dailyTransfer : period === 'monthly' ? amt <= this.limits.monthlyTransfer : false; };

accountSchema.statics.getUserAccounts = function (userId) { return this.find({ userId, status: 'active' }).sort({ createdAt: -1 }); };
accountSchema.statics.findByAccountNumber = function (accountNumber) { return this.findOne({ accountNumber, status: 'active' }); };

module.exports = mongoose.model('Account', accountSchema);
