const Transaction = require('../models/Transaction');
const User = require('../models/User');
const emailService = require('./email');
const { createInAppNotification } = require('../utils/notifications');
const { roundTwo, withTransactionOrFallback, findRecipientByAccountOrPhone, getTransferMeta } = require('../helpers/transaction.helpers');
const { createServiceError } = require('./service-error');

const validateTransferDetails = async ({ userId, body }) => {
    const { recipientAccount, recipientPhone, recipientBank, amount } = body;
    const { recipient, users } = await findRecipientByAccountOrPhone(recipientAccount, recipientPhone);

    if (users.length > 1) {
        return {
            statusCode: 300,
            body: {
                success: false, error: 'Multiple accounts found',
                message: 'Multiple accounts found for this phone number. Please specify which account to transfer to.',
                accounts: users.map(u => ({ _id: u._id, name: u.name, accountNumber: u.accountNumber, bankDetails: u.bankDetails })),
                needsAccountSelection: true
            }
        };
    }

    const { isInternalTransfer, transferType } = getTransferMeta(recipient);
    if (recipient && recipient._id.toString() === userId.toString()) throw createServiceError('Cannot transfer to your own account', 400);

    const sender = await User.findById(userId);
    const amt = roundTwo(Number(amount));
    const totalDebit = amt;
    const hasSufficientBalance = sender.balance >= totalDebit;

    return {
        statusCode: 200,
        body: {
            success: true,
            data: {
                transferAmount: amt, processingFee: 0, totalDebit, transferType, recipientFound: !!recipient,
                recipientName: recipient ? recipient.name : 'External Account', recipientBank: recipient ? recipient.bankDetails : recipientBank,
                senderBalance: sender.balance, hasSufficientBalance, estimatedArrival: isInternalTransfer ? 'Instant' : '2-3 business days'
            },
            message: hasSufficientBalance ? `Transfer preview: Rs ${amt.toLocaleString('en-IN')} transfer` : 'Insufficient balance for this transfer'
        }
    };
};

const transferMoney = async ({ userId, body }) => {
    const { recipientAccount, recipientPhone, recipientBank, amount, description, clientRequestId } = body;

    if (clientRequestId) {
        const existing = await Transaction.findOne({ userId, clientRequestId, category: 'transfer' });
        if (existing) {
            return {
                statusCode: 200,
                body: {
                    success: true,
                    data: { transaction: existing, message: 'Transfer already processed.', transferType: existing.transferType || 'internal', transferAmount: existing.amount, processingFee: 0, totalDebited: existing.amount },
                    duplicateIgnored: true
                }
            };
        }
    }

    const { recipient, users } = await findRecipientByAccountOrPhone(recipientAccount, recipientPhone);
    if (users.length > 1) {
        return {
            statusCode: 300,
            body: {
                success: false, error: 'Multiple accounts found',
                message: 'Multiple accounts found for this phone number. Please specify account number instead.',
                accounts: users.map(u => ({ _id: u._id, name: u.name, accountNumber: u.accountNumber, bankDetails: u.bankDetails })),
                needsAccountSelection: true
            }
        };
    }

    const { isInternalTransfer, transferType } = getTransferMeta(recipient);
    if (!isInternalTransfer && (!recipientBank?.bankName || (!recipientAccount && !recipientPhone))) {
        throw createServiceError('Recipient bank details and account/phone are required for external transfers', 400);
    }
    if (recipient && recipient._id.toString() === userId.toString()) throw createServiceError('Cannot transfer to your own account', 400);

    const amt = roundTwo(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) throw createServiceError('Invalid amount', 400);
    const totalDebit = amt;

    let sender, senderTx, recipientEmail = null, recipientTxId = null, recipientTxCreatedAt = null;

    await withTransactionOrFallback(async (sess) => {
        const opts = sess ? { session: sess } : {};
        sender = await User.findById(userId, null, opts);
        if (!sender) throw createServiceError('Sender not found', 404);
        if (sender.balance < totalDebit) throw createServiceError('Insufficient balance', 400);

        const senderNewBal = roundTwo(Number(sender.balance) - totalDebit);
        sender.balance = senderNewBal;
        await sender.save({ validateBeforeSave: false, ...opts });

        const txData = {
            userId, type: 'debit', transferType, amount: totalDebit, balance: senderNewBal, clientRequestId,
            description: description || `Transfer to ${recipient ? recipient.name : recipientAccount}`, category: 'transfer',
            recipientId: recipient ? recipient._id : null, recipientAccount, recipientName: recipient ? recipient.name : (body.recipientName || 'External Account'),
            recipientBank: recipientBank || null
        };
        senderTx = sess ? (await Transaction.create([txData], { session: sess }))[0] : await Transaction.create(txData);

        if (isInternalTransfer && recipient) {
            const recUser = await User.findById(recipient._id, null, opts);
            if (!recUser) throw createServiceError('Recipient not found', 404);

            const recNewBal = roundTwo(Number(recUser.balance) + amt);
            const recTxData = {
                userId: recUser._id, type: 'credit', transferType: 'internal', amount: amt, balance: recNewBal,
                description: `Transfer from ${sender.name}`, category: 'transfer', recipientId: userId,
                recipientAccount: sender.accountNumber, recipientName: sender.name
            };
            const recTx = sess ? (await Transaction.create([recTxData], { session: sess }))[0] : await Transaction.create(recTxData);

            recUser.balance = recNewBal;
            await recUser.save({ validateBeforeSave: false, ...opts });
            recipientEmail = recUser.email;
            recipientTxId = recTx._id;
            recipientTxCreatedAt = recTx.createdAt;
        }
    });

    const senderNotif = await createInAppNotification({
        userId, type: 'transaction', title: 'Transfer Sent',
        message: `Rs ${amt.toLocaleString('en-IN')} transferred ${recipient ? `to ${recipient.name}` : 'to external account'}.`,
        relatedId: senderTx._id, relatedModel: 'Transaction', metadata: { amount: amt, category: 'transfer' }
    });

    let senderEmail = false;
    if (sender?.preferences?.notifications?.email !== false) {
        emailService.sendTransactionNotification(sender.email, { type: 'debit', amount: amt, currency: 'INR', description: senderTx.description, timestamp: senderTx.createdAt }).catch(() => {});
        senderEmail = true;
    }

    let recNotif = false, recEmail = false;
    if (isInternalTransfer && recipient) {
        recNotif = await createInAppNotification({
            userId: recipient._id, type: 'transaction', title: 'Money Received',
            message: `Rs ${amt.toLocaleString('en-IN')} received from ${sender.name}.`,
            relatedId: recipientTxId || senderTx._id, relatedModel: 'Transaction', metadata: { amount: amt, category: 'transfer' }
        });

        if (recipientEmail) {
            emailService.sendTransactionNotification(recipientEmail, { type: 'credit', amount: amt, currency: 'INR', description: `Transfer from ${sender.name}`, timestamp: recipientTxCreatedAt || new Date() }).catch(() => {});
            recEmail = true;
        }
    }

    let message = `Successfully transferred Rs ${amt.toLocaleString('en-IN')} to ${recipient ? recipient.name : recipientAccount}`;
    if (!isInternalTransfer) message += ` (${recipientBank ? recipientBank.bankName : 'External Bank'})`;

    return {
        statusCode: 201,
        body: {
            success: true,
            data: {
                transaction: senderTx, message, transferType, transferAmount: amt, processingFee: 0, totalDebited: totalDebit,
                delivery: { sender: { notificationCreated: !!senderNotif, emailSent: senderEmail }, recipient: { notificationCreated: recNotif, emailSent: recEmail } }
            }
        }
    };
};

module.exports = { validateTransferDetails, transferMoney };
