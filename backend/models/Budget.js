const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, maxlength: 50 },
    category: { type: String, required: true, enum: ['food', 'transport', 'entertainment', 'shopping', 'utilities', 'rent', 'insurance', 'healthcare', 'education', 'savings', 'investment', 'debt_payment', 'miscellaneous', 'other'] },
    amount: { type: Number, required: true, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
    period: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'], default: 'monthly' },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    status: { type: String, enum: ['active', 'completed', 'over_budget', 'cancelled'], default: 'active' },
    alerts: { warningThreshold: { type: Number, default: 80 }, criticalThreshold: { type: Number, default: 100 }, emailAlerts: { type: Boolean, default: true }, smsAlerts: { type: Boolean, default: false } },
    isRecurring: { type: Boolean, default: false },
    recurringFrequency: { type: String, enum: ['weekly', 'monthly', 'yearly'] },
    notes: { type: String, maxlength: 200 }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

budgetSchema.index({ userId: 1, category: 1 }); budgetSchema.index({ userId: 1, status: 1 }); budgetSchema.index({ userId: 1, period: 1 });

budgetSchema.virtual('remaining').get(function () { return Math.max(0, this.amount - this.spent); });
budgetSchema.virtual('spentPercent').get(function () { return this.amount ? (this.spent / this.amount) * 100 : 0; });
budgetSchema.virtual('budgetStatus').get(function () {
    const pct = this.spentPercent;
    if (pct >= 100) return 'over_budget';
    if (pct >= this.alerts.criticalThreshold) return 'critical';
    return pct >= this.alerts.warningThreshold ? 'warning' : 'good';
});
budgetSchema.virtual('daysRemaining').get(function () { return this.endDate ? Math.ceil((this.endDate - new Date()) / 86400000) : null; });

budgetSchema.pre('save', function (next) {
    if (this.isNew && !this.endDate) {
        const s = new Date(this.startDate);
        if (this.period === 'weekly') this.endDate = new Date(s.getTime() + 7 * 86400000);
        else if (this.period === 'monthly') this.endDate = new Date(s.getFullYear(), s.getMonth() + 1, s.getDate());
        else if (this.period === 'yearly') this.endDate = new Date(s.getFullYear() + 1, s.getMonth(), s.getDate());
    }
    next();
});

budgetSchema.methods.addExpense = function (amt) { this.spent += amt; if (this.spent >= this.amount) this.status = 'over_budget'; return this.save(); };
budgetSchema.methods.isExceeded = function () { return this.spent >= this.amount; };
budgetSchema.methods.getProgress = function () { return { spent: this.spent, remaining: this.remaining, spentPercent: this.spentPercent, status: this.budgetStatus, daysRemaining: this.daysRemaining }; };

budgetSchema.statics.getUserBudgets = function (userId, status = 'active') { return this.find({ userId, status }).sort({ createdAt: -1 }); };
budgetSchema.statics.getBudgetsByCategory = function (userId, category) { return this.find({ userId, category, status: 'active' }); };
budgetSchema.statics.getBudgetSummary = function (userId) {
    return this.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId), status: 'active' } }, { $group: { _id: null, totalBudget: { $sum: '$amount' }, totalSpent: { $sum: '$spent' }, budgetCount: { $sum: 1 }, overBudgetCount: { $sum: { $cond: [{ $gte: ['$spent', '$amount'] }, 1, 0] } } } }]);
};

module.exports = mongoose.model('Budget', budgetSchema);
