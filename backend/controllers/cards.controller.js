const Card = require('../models/Card');
const Account = require('../models/Account');
const User = require('../models/User');
const crypto = require('crypto');
const { createInAppNotification } = require('../utils/notifications');
const { logAdminAction } = require('../utils/adminAudit');
const asyncHandler = require('../utils/asyncHandler');

const isOwnerOrAdmin = (resourceUserId, reqUser) => resourceUserId.toString() === reqUser._id.toString() || reqUser.role === 'admin';

const assertCardOwnership = (card, user) => {
    if (card.userId.toString() !== user._id.toString()) {
        const error = new Error('Not authorized to access this card');
        error.statusCode = 403;
        throw error;
    }
};

const getGeneratedExpiry = () => {
    const now = new Date();
    const expiry = new Date(now.getFullYear(), now.getMonth() + crypto.randomInt(36, 61), 1);
    return { month: expiry.getMonth() + 1, year: expiry.getFullYear() };
};

const getUserCards = async (req, res) => {
    const cards = await Card.find({ userId: req.user._id, status: { $ne: 'closed' } }).select('-pin +cvvEncrypted +cvvIv +cvvTag').sort({ createdAt: -1 });
    const safe = cards.map(c => {
        const obj = c.toObject();
        delete obj.cvvEncrypted; delete obj.cvvIv; delete obj.cvvTag; delete obj.pin;
        return obj;
    });
    res.status(200).json({ success: true, data: safe });
};

const createCard = async (req, res) => {
    const { cardType, cardBrand, cardName, pin } = req.body;
    let account = (req.user.accountId && await Account.findById(req.user.accountId)) || await Account.findOne({ userId: req.user._id, status: 'active' });
    if (!account) {
        const accName = ((req.user?.name || 'Primary Account') + ' Primary Account').replace(/[^A-Za-z0-9 ]+/g, ' ').trim();
        account = await Account.create({
            userId: req.user._id, accountType: 'savings', accountName: accName, balance: 0, currency: 'INR', status: 'active',
            accountNumber: 'SA' + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 4).toUpperCase()
        });
    }

    const { month, year } = getGeneratedExpiry();
    const defaultCvv = String(crypto.randomInt(100, 999)).padStart(3, '0');
    const brand = cardBrand || (cardType === 'credit' ? 'mastercard' : 'visa');
    const type = cardType || 'debit';
    const prefix = brand === 'visa' ? '4' : brand === 'mastercard' ? '5' : brand === 'amex' ? '3' : '6';
    let cardNum = prefix;
    for (let i = 0; i < 15; i++) cardNum += Math.floor(Math.random() * 10);

    const newCard = new Card({ userId: req.user._id, accountId: account._id, cardNumber: cardNum, cardType: type, cardBrand: brand, cardName, expiryMonth: month, expiryYear: year });
    newCard.setCvv(defaultCvv);
    if (pin) await newCard.setPin(pin);
    await newCard.save();

    const safeCard = await Card.findById(newCard._id).select('-pin -cvvEncrypted -cvvIv -cvvTag');
    await createInAppNotification({
        userId: req.user._id, type: 'account_update', title: 'New Card Created',
        message: `${cardName || 'Your card'} ending with ${String(safeCard.cardNumber || '').slice(-4)} has been created.`,
        priority: 'medium', relatedId: safeCard._id, relatedModel: 'Card', metadata: { category: 'card' }
    });
    res.status(201).json({ success: true, data: safeCard });
};

const updateCardPin = async (req, res) => {
    const { currentPin, newPin } = req.body;
    if (!newPin || typeof newPin !== 'string' || !/^\d{4,6}$/.test(newPin)) {
        const error = new Error('New PIN is required and must be 4 to 6 digits');
        error.statusCode = 400;
        throw error;
    }
    const card = await Card.findById(req.params.id).select('+pin');
    if (!card) {
        const error = new Error('Card not found');
        error.statusCode = 404;
        throw error;
    }
    assertCardOwnership(card, req.user);
    if (card.status !== 'active') {
        const error = new Error('Card is not active');
        error.statusCode = 400;
        throw error;
    }
    if (card.pin && !(await card.validatePin(currentPin || ''))) {
        const error = new Error('Current PIN is incorrect');
        error.statusCode = 400;
        throw error;
    }

    await card.setPin(newPin);
    await card.save();

    await createInAppNotification({
        userId: req.user._id, type: 'security_alert', title: 'Card PIN Updated',
        message: `PIN updated for card ending with ${String(card.cardNumber || '').slice(-4)}.`,
        priority: 'high', relatedId: card._id, relatedModel: 'Card', metadata: { category: 'security' }
    });
    res.status(200).json({ success: true, message: 'PIN updated successfully' });
};

const updateCardStatus = async (req, res) => {
    const { status } = req.body;
    if (!['active', 'inactive', 'blocked', 'lost', 'expired', 'closed'].includes(status)) {
        const error = new Error('Invalid status');
        error.statusCode = 400;
        throw error;
    }
    const card = await Card.findById(req.params.id);
    if (!card) {
        const error = new Error('Card not found');
        error.statusCode = 404;
        throw error;
    }
    if (!isOwnerOrAdmin(card.userId, req.user)) {
        const error = new Error('Not authorized to update this card');
        error.statusCode = 403;
        throw error;
    }

    const isOwner = card.userId.toString() === req.user._id.toString();
    const isAdminAction = req.user.role === 'admin' && !isOwner;

    // Regular users cannot directly change card status — they must use the request/approval flow
    if (isOwner && req.user.role !== 'admin') {
        const error = new Error('Please use the card status request flow. Bank admin approval is required for all card status changes.');
        error.statusCode = 403;
        throw error;
    }
    if (!isAdminAction && card.status === 'blocked' && status !== 'blocked') {
        const error = new Error('This card is blocked by bank. Please contact bank support.');
        error.statusCode = 403;
        throw error;
    }
    if (card.status === 'closed' && status !== 'closed') {
        const error = new Error('Closed cards cannot be reopened');
        error.statusCode = 400;
        throw error;
    }

    const previousStatus = card.status;
    card.status = status;
    if (card.statusRequest?.status === 'pending') {
        card.statusRequest.status = 'rejected';
        card.statusRequest.reviewedBy = req.user._id;
        card.statusRequest.reviewedAt = new Date();
    }
    await card.save();

    if (isAdminAction && previousStatus !== status) {
        await logAdminAction(req, { action: 'card_status_updated', targetType: 'card', targetId: String(card._id), metadata: { userId: String(card.userId), previousStatus, nextStatus: status } });
    }

    const isBlocked = status === 'blocked';
    await createInAppNotification({
        userId: card.userId, type: isBlocked || status === 'lost' ? 'card_blocked' : 'account_update',
        title: isAdminAction && isBlocked ? 'Card Blocked by Bank' : isAdminAction && previousStatus === 'blocked' && status === 'active' ? 'Card Unblocked by Bank' : 'Card Status Updated',
        message: isAdminAction && isBlocked ? `Your card ending with ${String(card.cardNumber || '').slice(-4)} has been blocked by bank admin. Please contact bank support.` : `Card ending with ${String(card.cardNumber || '').slice(-4)} is now ${status}.`,
        priority: isBlocked || status === 'lost' ? 'high' : 'medium', relatedId: card._id, relatedModel: 'Card',
        metadata: { category: 'card', actorId: req.user._id, actorRole: req.user.role, previousStatus }
    });

    res.status(200).json({ success: true, message: `Card status updated to ${status}` });
};

const requestCardStatusChange = async (req, res) => {
    const card = await Card.findById(req.params.id);
    if (!card) {
        const error = new Error('Card not found');
        error.statusCode = 404;
        throw error;
    }
    assertCardOwnership(card, req.user);
    if (['lost', 'expired', 'closed'].includes(card.status)) {
        const error = new Error('This card status cannot be changed.');
        error.statusCode = 400;
        throw error;
    }
    if (card.status === 'blocked') {
        const error = new Error('This card is blocked by bank. Please contact support.');
        error.statusCode = 400;
        throw error;
    }

    const targetStatus = req.body?.status || req.body?.requestedStatus;
    const requestedStatus = targetStatus && ['active', 'inactive', 'closed'].includes(targetStatus)
        ? targetStatus
        : (card.status === 'active' ? 'inactive' : 'active');

    if (card.statusRequest?.status === 'pending' && card.statusRequest?.requestedStatus === requestedStatus) {
        return res.status(200).json({ success: true, message: 'Your request is already pending bank review.' });
    }

    card.statusRequest = { requestedStatus, status: 'pending', requestedBy: req.user._id, requestedAt: new Date(), reviewedBy: null, reviewedAt: null };
    await card.save();

    const actionText = requestedStatus === 'closed' ? 'closure' : requestedStatus === 'inactive' ? 'lock' : 'unlock';
    await createInAppNotification({
        userId: req.user._id, type: 'account_update', title: 'Card Request Submitted',
        message: `Your ${actionText} request for card ending with ${String(card.cardNumber || '').slice(-4)} is under review. Bank team will review it shortly.`,
        priority: 'medium', relatedId: card._id, relatedModel: 'Card', metadata: { category: 'card', requestedStatus }
    });

    res.status(200).json({ success: true, message: `Your card ${actionText} request has been submitted for bank admin approval.` });
};

const reviewCardStatusRequest = async (req, res) => {
    const action = String(req.body?.action || '').toLowerCase();
    if (!['approve', 'reject'].includes(action)) {
        const error = new Error('Action must be either approve or reject');
        error.statusCode = 400;
        throw error;
    }
    const card = await Card.findById(req.params.id);
    if (!card) {
        const error = new Error('Card not found');
        error.statusCode = 404;
        throw error;
    }
    if (card.statusRequest?.status !== 'pending' || !card.statusRequest?.requestedStatus) {
        const error = new Error('No pending request found for this card');
        error.statusCode = 400;
        throw error;
    }

    const previousStatus = card.status;
    const requestedStatus = card.statusRequest.requestedStatus;
    const isApprove = action === 'approve';

    if (isApprove) { card.status = requestedStatus; card.statusRequest.status = 'approved'; }
    else card.statusRequest.status = 'rejected';

    card.statusRequest.reviewedBy = req.user._id;
    card.statusRequest.reviewedAt = new Date();
    await card.save();

    await logAdminAction(req, { action: 'card_status_request_reviewed', targetType: 'card', targetId: String(card._id), metadata: { userId: String(card.userId), previousStatus, requestedStatus, decision: action } });
    await createInAppNotification({
        userId: card.userId, type: 'account_update', title: isApprove ? 'Card Request Approved' : 'Card Request Rejected',
        message: isApprove ? `Your request has been approved. Card ending with ${String(card.cardNumber || '').slice(-4)} is now ${requestedStatus}.` : `Your card status request for card ending with ${String(card.cardNumber || '').slice(-4)} was reviewed and rejected by bank admin.`,
        priority: 'medium', relatedId: card._id, relatedModel: 'Card', metadata: { category: 'card', previousStatus, requestedStatus, decision: action }
    });

    res.status(200).json({ success: true, message: isApprove ? `Card request approved. Status updated to ${requestedStatus}.` : 'Card request rejected.' });
};

const getUserCardsAdmin = async (req, res) => {
    if (req.user.role !== 'admin') {
        const error = new Error('Not authorized to access this route');
        error.statusCode = 403;
        throw error;
    }
    const cards = await Card.find({ userId: req.params.id, status: { $ne: 'closed' } }).select('-pin -cvvEncrypted -cvvIv -cvvTag').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: cards });
};

const revealCardCvv = async (req, res) => {
    const { pin } = req.body || {};
    if (!pin || !/^\d{4,6}$/.test(String(pin))) {
        const error = new Error('Valid PIN is required');
        error.statusCode = 400;
        throw error;
    }
    const user = await User.findById(req.user._id).select('+pin');
    if (!user || !(await user.comparePin(String(pin)))) {
        const error = new Error(user ? 'Invalid PIN' : 'User not found');
        error.statusCode = user ? 401 : 404;
        throw error;
    }
    const card = await Card.findById(req.params.id).select('+cvvEncrypted +cvvIv +cvvTag');
    if (!card) {
        const error = new Error('Card not found');
        error.statusCode = 404;
        throw error;
    }
    assertCardOwnership(card, req.user);

    const cvv = card.getCvvPlain();
    if (!cvv) {
        const error = new Error('Unable to reveal CVV');
        error.statusCode = 500;
        throw error;
    }
    res.status(200).json({ success: true, data: { cardId: card._id, cvv } });
};

module.exports = {
    getUserCards: asyncHandler(getUserCards),
    createCard: asyncHandler(createCard),
    updateCardPin: asyncHandler(updateCardPin),
    updateCardStatus: asyncHandler(updateCardStatus),
    requestCardStatusChange: asyncHandler(requestCardStatusChange),
    reviewCardStatusRequest: asyncHandler(reviewCardStatusRequest),
    getUserCardsAdmin: asyncHandler(getUserCardsAdmin),
    revealCardCvv: asyncHandler(revealCardCvv)
};