const Bank = require('../models/Bank');
const User = require('../models/User');
const { logAdminAction } = require('../utils/adminAudit');
const asyncHandler = require('../utils/asyncHandler');

const escapeRegExp = (v = '') => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildBankId = name => `${String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'bank'}-${Date.now().toString(36)}`;

const normalizePayload = (p = {}) => ({
    id: p.id ? String(p.id).trim() : undefined,
    name: p.name ? String(p.name).trim() : undefined,
    bankCode: (p.bankCode || p.ifscPrefix) ? String(p.bankCode || p.ifscPrefix).trim().toUpperCase() : undefined,
    description: p.description ? String(p.description).trim() : undefined
});

const buildDuplicateQuery = (name, bankCode, excludeId = null) => {
    const clauses = [];
    if (name) clauses.push({ name: new RegExp(`^${escapeRegExp(name)}$`, 'i') });
    if (bankCode) {
        clauses.push({ bankCode: new RegExp(`^${escapeRegExp(bankCode)}$`, 'i') });
        clauses.push({ ifscPrefix: new RegExp(`^${escapeRegExp(bankCode)}$`, 'i') });
    }
    if (!clauses.length) return null;
    const query = { $or: clauses };
    if (excludeId) query._id = { $ne: excludeId };
    return query;
};

const getBanks = async (req, res) => {
    const data = await Bank.find().sort({ name: 1 });
    res.status(200).json({ success: true, data });
};

const addBank = async (req, res) => {
    const { id, name, bankCode, description } = normalizePayload(req.body);
    if (!name || !bankCode || !description) {
        const error = new Error('All fields are required');
        error.statusCode = 400;
        throw error;
    }

    const dupQuery = buildDuplicateQuery(name, bankCode);
    const existing = await Bank.findOne(dupQuery).select('_id');
    if (existing) {
        const error = new Error('Bank already exists');
        error.statusCode = 409;
        throw error;
    }

    const bank = await Bank.create({ id: id || buildBankId(name), name, bankCode, ifscPrefix: bankCode, description });
    await logAdminAction(req, { action: 'bank_created', targetType: 'bank', targetId: String(bank._id), metadata: { bankName: bank.name, bankCode: bank.bankCode } });
    res.status(201).json({ success: true, data: bank });
};

const updateBank = async (req, res) => {
    const payload = normalizePayload(req.body);
    const updates = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.bankCode !== undefined) { updates.bankCode = payload.bankCode; updates.ifscPrefix = payload.bankCode; }
    if (payload.description !== undefined) updates.description = payload.description;

    if (!Object.keys(updates).length) {
        const error = new Error('No valid fields provided to update');
        error.statusCode = 400;
        throw error;
    }
    if (Object.values(updates).some(v => !v)) {
        const error = new Error('Bank fields cannot be empty');
        error.statusCode = 400;
        throw error;
    }

    const dupQuery = buildDuplicateQuery(updates.name, updates.bankCode, req.params.id);
    if (dupQuery && await Bank.findOne(dupQuery).select('_id')) {
        const error = new Error('Bank already exists');
        error.statusCode = 409;
        throw error;
    }

    const bank = await Bank.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!bank) {
        const error = new Error('Bank not found');
        error.statusCode = 404;
        throw error;
    }

    await logAdminAction(req, { action: 'bank_updated', targetType: 'bank', targetId: String(bank._id), metadata: { updates } });
    res.status(200).json({ success: true, data: bank });
};

const deleteBank = async (req, res) => {
    const bank = await Bank.findById(req.params.id);
    if (!bank) {
        const error = new Error('Bank not found');
        error.statusCode = 404;
        throw error;
    }

    const usersCount = await User.countDocuments({ 'bankDetails.bankName': new RegExp(`^${escapeRegExp(bank.name)}$`, 'i') });
    if (usersCount > 0) {
        const error = new Error(`Cannot delete bank. It is currently used by ${usersCount} user account(s).`);
        error.statusCode = 409;
        throw error;
    }

    await Bank.findByIdAndDelete(req.params.id);
    await logAdminAction(req, { action: 'bank_deleted', targetType: 'bank', targetId: String(bank._id), metadata: { bankName: bank.name } });
    res.status(200).json({ success: true, message: 'Bank deleted successfully' });
};

module.exports = {
    getBanks: asyncHandler(getBanks),
    addBank: asyncHandler(addBank),
    updateBank: asyncHandler(updateBank),
    deleteBank: asyncHandler(deleteBank)
};