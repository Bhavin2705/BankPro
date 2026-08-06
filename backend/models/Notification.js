const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['transaction', 'bill_due', 'bill_paid', 'goal_progress', 'budget_alert', 'low_balance', 'card_expired', 'card_blocked', 'security_alert', 'account_update', 'investment_update', 'system_maintenance', 'other'], required: true },
    title: { type: String, required: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 500 },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['unread', 'read', 'archived'], default: 'unread' },
    relatedId: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedModel' },
    relatedModel: { type: String, enum: ['Transaction', 'Bill', 'Goal', 'Budget', 'Card', 'Account', 'Investment'] },
    channels: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false }, sms: { type: Boolean, default: false }, push: { type: Boolean, default: false } },
    deliveryStatus: { emailSent: { type: Boolean, default: false }, smsSent: { type: Boolean, default: false }, pushSent: { type: Boolean, default: false }, emailSentAt: Date, smsSentAt: Date, pushSentAt: Date },
    scheduledFor: Date, expiresAt: Date, actions: [{ label: String, action: String, url: String }],
    metadata: { amount: Number, currency: { type: String, default: 'INR' }, category: String, location: String, device: String }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

notificationSchema.index({ userId: 1, status: 1 }); notificationSchema.index({ userId: 1, createdAt: -1 }); notificationSchema.index({ userId: 1, type: 1 }); notificationSchema.index({ scheduledFor: 1 }); notificationSchema.index({ expiresAt: 1 });

notificationSchema.virtual('isExpired').get(function () { return this.expiresAt && new Date() > this.expiresAt; });
notificationSchema.virtual('timeAgo').get(function () {
    const diffMs = new Date() - this.createdAt;
    const days = Math.floor(diffMs / 86400000), hrs = Math.floor(diffMs / 3600000), mins = Math.floor(diffMs / 60000);
    return days > 0 ? `${days} days ago` : hrs > 0 ? `${hrs} hours ago` : mins > 0 ? `${mins} minutes ago` : 'Just now';
});

notificationSchema.pre('save', function (next) {
    if (!this.expiresAt) this.expiresAt = new Date(Date.now() + 30 * 86400000);
    if (!this.scheduledFor) this.scheduledFor = new Date();
    next();
});

notificationSchema.methods.markAsRead = function () { this.status = 'read'; return this.save(); };
notificationSchema.methods.archive = function () { this.status = 'archived'; return this.save(); };
notificationSchema.methods.sendEmail = async function () {
    if (!this.channels.email || this.deliveryStatus.emailSent) return;
    this.deliveryStatus.emailSent = true; this.deliveryStatus.emailSentAt = new Date(); await this.save();
};
notificationSchema.methods.sendSMS = async function () {
    if (!this.channels.sms || this.deliveryStatus.smsSent) return;
    this.deliveryStatus.smsSent = true; this.deliveryStatus.smsSentAt = new Date(); await this.save();
};

notificationSchema.statics.getUserNotifications = function (userId, status = 'unread', limit = 50) { return this.find({ userId, status }).sort({ createdAt: -1 }).limit(limit).populate('relatedId'); };
notificationSchema.statics.getUnreadCount = function (userId) { return this.countDocuments({ userId, status: 'unread' }); };
notificationSchema.statics.markAllAsRead = function (userId) { return this.updateMany({ userId, status: 'unread' }, { status: 'read' }); };
notificationSchema.statics.createTransactionNotification = function (userId, tx) {
    return this.create({ userId, type: 'transaction', title: tx.type === 'credit' ? 'Money Received' : 'Money Sent', message: `Rs ${tx.amount.toLocaleString('en-IN')} ${tx.type === 'credit' ? 'credited to' : 'debited from'} your account`, relatedId: tx._id, relatedModel: 'Transaction', metadata: { amount: tx.amount, category: tx.category } });
};
notificationSchema.statics.createBillDueNotification = function (userId, bill) {
    return this.create({ userId, type: 'bill_due', title: 'Bill Due Soon', message: `Your ${bill.name} bill of Rs ${bill.amount.toLocaleString('en-IN')} is due on ${bill.dueDate.toDateString()}`, priority: 'high', relatedId: bill._id, relatedModel: 'Bill', channels: { email: true, sms: true }, metadata: { amount: bill.amount } });
};
notificationSchema.statics.createLowBalanceNotification = function (userId, account, balance) {
    return this.create({ userId, type: 'low_balance', title: 'Low Balance Alert', message: `Your account balance is Rs ${balance.toLocaleString('en-IN')}. Consider adding funds to avoid transaction failures.`, priority: 'high', relatedId: account._id, relatedModel: 'Account', channels: { email: true, sms: true }, metadata: { amount: balance } });
};

module.exports = mongoose.model('Notification', notificationSchema);
