const Transaction = require('../models/Transaction');
const Card = require('../models/Card');
const User = require('../models/User');
const emailService = require('./email');
const { createInAppNotification } = require('../utils/notifications');
const { roundTwo, withTransactionOrFallback } = require('../helpers/transaction.helpers');
const { createServiceError } = require('./service-error');

const createTransaction = async ({ userId, body }) => {
    const { type, amount, description, category, cardId, recipientId, recipientAccount, recipientName, clientRequestId } = body;

    if (clientRequestId) {
        const existing = await Transaction.findOne({ userId, clientRequestId });
        if (existing) return { existingTransaction: existing, duplicateIgnored: true };
    }

    const numericAmount = roundTwo(Number(amount));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw createServiceError('Invalid amount', 400);

    const finalDesc = description?.trim() || (type === 'credit' ? 'Credit transaction' : 'Debit transaction');
    const finalCategory = category?.trim() || (type === 'credit' ? 'deposit' : type === 'debit' ? 'withdrawal' : 'transfer');

    let validatedCard = null;
    if (cardId) {
        validatedCard = await Card.findById(cardId);
        if (!validatedCard) throw createServiceError('Card not found', 404);
        if (validatedCard.userId.toString() !== userId.toString()) throw createServiceError('Not authorized to use this card', 403);
        if (type === 'debit' && !validatedCard.canTransact(numericAmount, 'online')) throw createServiceError('Card is locked or unavailable for transactions', 400);
    }

    let transaction, user;

    await withTransactionOrFallback(async (sess) => {
        const opts = sess ? { session: sess } : {};
        user = await User.findById(userId, null, opts);
        if (!user) throw createServiceError('User not found', 404);

        let newBalance = roundTwo(Number(user.balance));
        if (type === 'credit') newBalance = roundTwo(newBalance + numericAmount);
        else if (type === 'debit' || type === 'transfer') {
            if (newBalance < numericAmount) throw createServiceError('Insufficient balance', 400);
            newBalance = roundTwo(newBalance - numericAmount);
        }

        const txPayload = { userId, type, amount: numericAmount, balance: newBalance, description: finalDesc, category: finalCategory, cardId: validatedCard?._id, clientRequestId, recipientId, recipientAccount, recipientName };
        transaction = sess ? (await Transaction.create([txPayload], { session: sess }))[0] : await Transaction.create(txPayload);
        await User.updateOne({ _id: userId }, { balance: newBalance }, opts);

        // NOTE: transfer recipient crediting is handled exclusively by transfer.service.js
        // Do NOT credit the recipient here to avoid double-credit bugs.
    });

    const createdNotif = await createInAppNotification({
        userId, type: 'transaction', title: type === 'credit' ? 'Deposit Successful' : 'Withdrawal Successful',
        message: `Rs ${numericAmount.toLocaleString('en-IN')} ${type === 'credit' ? 'credited to' : 'debited from'} your account.`,
        relatedId: transaction._id, relatedModel: 'Transaction', metadata: { amount: numericAmount, category: finalCategory }
    });

    let emailSent = false;
    if (user?.preferences?.notifications?.email !== false) {
        emailService.sendTransactionNotification(user.email, { type, amount: numericAmount, currency: 'INR', description: finalDesc, timestamp: transaction.createdAt }).catch(() => {});
    }

    const txData = transaction.toObject();
    txData.delivery = { notificationCreated: !!createdNotif, emailSent };
    return { transactionData: txData, duplicateIgnored: false };
};

const deleteTransaction = async ({ userId, transactionId }) => {
    const tx = await Transaction.findById(transactionId);
    if (!tx) throw createServiceError('Transaction not found', 404);
    if (tx.userId.toString() !== userId.toString()) throw createServiceError('Not authorized to delete this transaction', 403);
    const owner = await User.findById(tx.userId);
    if (!owner) throw createServiceError('User not found', 404);

    let newBal = roundTwo(Number(owner.balance) || 0);
    if (tx.type === 'credit') newBal = roundTwo(newBal - (Number(tx.amount) || 0));
    else if (tx.type === 'debit' || tx.type === 'transfer') newBal = roundTwo(newBal + (Number(tx.amount) || 0));
    if (newBal < 0) throw createServiceError('Deleting this transaction would result in a negative balance', 400);

    await withTransactionOrFallback(async (sess) => {
        const opts = sess ? { session: sess } : {};
        await User.findByIdAndUpdate(tx.userId, { balance: newBal }, { ...opts, runValidators: true });
        await Transaction.findByIdAndDelete(transactionId, opts);

        // If this was a transfer debit, find and delete the matching recipient credit
        // and reverse the recipient's balance to prevent phantom money creation
        if ((tx.type === 'debit' || tx.type === 'transfer') && tx.recipientId) {
            const recipientTx = await Transaction.findOne({
                userId: tx.recipientId,
                type: 'credit',
                amount: tx.amount,
                category: 'transfer',
                recipientId: tx.userId
            }, null, opts);

            if (recipientTx) {
                const recipientOwner = await User.findById(tx.recipientId, null, opts);
                if (recipientOwner) {
                    const recipientNewBal = roundTwo(Number(recipientOwner.balance) - (Number(tx.amount) || 0));
                    if (recipientNewBal >= 0) {
                        await User.findByIdAndUpdate(tx.recipientId, { balance: recipientNewBal }, { ...opts, runValidators: true });
                    }
                }
                await Transaction.findByIdAndDelete(recipientTx._id, opts);
            }
        }
    });
};

module.exports = { createTransaction, deleteTransaction, createServiceError };
