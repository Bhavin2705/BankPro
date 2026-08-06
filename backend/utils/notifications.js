const Notification = require('../models/Notification');
const User = require('../models/User');

const MONEY_TYPES = new Set(['transaction', 'bill_paid']);

const createInAppNotification = async ({ userId, type = 'other', title, message, priority = 'medium', relatedId, relatedModel, metadata = {}, dedupe = true, dedupeWindowMs = 300000 }) => {
    if (!userId || !title || !message) return null;
    if (MONEY_TYPES.has(type) && (!Number.isFinite(Number(metadata?.amount)) || Number(metadata?.amount) <= 0)) return null;

    try {
        const user = await User.findById(userId).select('preferences').lean();
        const emailPref = user?.preferences?.notifications?.email !== false;
        const smsPref = user?.preferences?.notifications?.sms !== false;
        const pushPref = user?.preferences?.notifications?.push !== false;

        if (dedupe) {
            const query = { userId, type, title, message, status: { $ne: 'archived' }, createdAt: { $gte: new Date(Date.now() - Math.max(0, dedupeWindowMs)) }, ...(relatedId && { relatedId }) };
            const existing = await Notification.findOne(query).sort({ createdAt: -1 });
            if (existing) {
                existing.status = 'unread';
                existing.metadata = { ...(existing.metadata || {}), ...(metadata || {}), dedupeCount: ((existing.metadata?.dedupeCount) || 1) + 1 };
                await existing.save();
                return existing;
            }
        }

        return await Notification.create({
            userId,
            type,
            title,
            message,
            priority,
            status: 'unread',
            channels: { inApp: true, email: emailPref, sms: smsPref, push: pushPref },
            relatedId,
            relatedModel,
            metadata
        });
    } catch (err) {
        console.error('Failed to create in-app notification:', err?.message || err);
        return null;
    }
};

module.exports = { createInAppNotification };
