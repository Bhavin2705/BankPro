const mongoose = require('mongoose');

const AdminActionLogSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: String, required: true, trim: true },
    metadata: { type: Object, default: {} },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' }
}, { timestamps: true });

AdminActionLogSchema.index({ createdAt: -1 });
AdminActionLogSchema.index({ adminId: 1, createdAt: -1 });
AdminActionLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminActionLog', AdminActionLogSchema);
