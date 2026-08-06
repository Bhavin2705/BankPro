const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, validateCardCreation, validatePinUpdate, validatePinVerification, validateCardStatusReviewAction } = require('../middleware/validation');
const { apiLimiter, pinLimiter } = require('../middleware/rateLimit');
const cardsController = require('../controllers/cards.controller');

const router = express.Router();
router.use(protect, apiLimiter);

router.get('/', cardsController.getUserCards);
router.get('/admin/user/:id', authorize('admin'), validateObjectId, cardsController.getUserCardsAdmin);
router.post('/', validateCardCreation, cardsController.createCard);
router.put('/:id/pin', pinLimiter, validateObjectId, validatePinUpdate, cardsController.updateCardPin);
router.put('/:id/status', validateObjectId, cardsController.updateCardStatus);
router.post('/:id/status-request', validateObjectId, cardsController.requestCardStatusChange);
router.put('/:id/status-request', authorize('admin'), validateObjectId, validateCardStatusReviewAction, cardsController.reviewCardStatusRequest);
router.post('/:id/reveal-cvv', pinLimiter, validateObjectId, validatePinVerification, cardsController.revealCardCvv);

module.exports = router;
