const AdminActionLog = require('../models/AdminActionLog');

const getClientIp = req => (String(req.headers['x-forwarded-for'] || '').split(',')[0] || req.ip || req.socket?.remoteAddress || '').trim();

const logAdminAction = async (req, payload = {}) => {
    try {
        if (!req?.user || req.user.role !== 'admin') return;
        const action = String(payload.action || '').trim(), targetType = String(payload.targetType || '').trim(), targetId = String(payload.targetId || '').trim();
        if (!action || !targetType || !targetId) return;

        await AdminActionLog.create({ adminId: req.user._id, action, targetType, targetId, metadata: payload.metadata || {}, ipAddress: getClientIp(req), userAgent: String(req.headers['user-agent'] || '') });
    } catch (err) { console.error('Failed to write admin audit log:', err); }
};

module.exports = { logAdminAction };
