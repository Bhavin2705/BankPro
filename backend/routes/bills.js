const express = require('express');
const { getBills, getBill, createBill, updateBill, deleteBill, payBill, getBillStats } = require('../controllers/bill.controller');
const { protect } = require('../middleware/auth');
const { apiLimiter, transactionLimiter } = require('../middleware/rateLimit');
const { validateBillCreate, validateBillUpdate, validateBillPayment, validateObjectId } = require('../middleware/validation');

const router = express.Router();
router.use(protect, apiLimiter);

router.get('/', getBills);
router.get('/stats', getBillStats);
router.get('/:id', validateObjectId, getBill);
router.post('/', transactionLimiter, validateBillCreate, createBill);
router.post('/:id/pay', transactionLimiter, validateObjectId, validateBillPayment, payBill);
router.put('/:id', validateObjectId, validateBillUpdate, updateBill);
router.delete('/:id', validateObjectId, deleteBill);

module.exports = router;