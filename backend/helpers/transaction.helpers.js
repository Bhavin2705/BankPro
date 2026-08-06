const mongoose = require('mongoose');
const User = require('../models/User');

const roundTwo = val => Math.round(((Number(val) || 0) + Number.EPSILON) * 100) / 100;

const useDbTransactions = String(process.env.ENABLE_DB_TRANSACTIONS || 'true').toLowerCase() === 'true';

const isTxUnsupported = (err) => {
    const msg = String(err?.message || '').toLowerCase();
    return msg.includes('replica set member') || msg.includes('replicaset') || msg.includes('not supported') || msg.includes('standalone');
};

const withTransactionOrFallback = async (workFn) => {
    if (!useDbTransactions) {
        return await workFn(null);
    }
    let session = null;
    try {
        session = await mongoose.startSession();
        let result;
        await session.withTransaction(async () => {
            result = await workFn(session);
        });
        return result;
    } catch (err) {
        if (isTxUnsupported(err)) {
            return await workFn(null);
        }
        throw err;
    } finally {
        if (session) session.endSession();
    }
};

const findRecipientByAccountOrPhone = async (acc, phone) => {
    if (acc) return { recipient: await User.findOne({ accountNumber: acc }), users: [] };
    if (phone) {
        const users = await User.find({ phone });
        return { recipient: users.length === 1 ? users[0] : null, users };
    }
    return { recipient: null, users: [] };
};

const getTransferMeta = recipient => ({ isInternalTransfer: Boolean(recipient), transferType: recipient ? 'internal' : 'external' });

module.exports = { roundTwo, withTransactionOrFallback, findRecipientByAccountOrPhone, getTransferMeta };
