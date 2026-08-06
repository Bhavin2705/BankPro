const express = require('express');
const { getTransactions, getUserTransactionsAdmin, getTransaction, createTransaction, updateTransaction, deleteTransaction, getTransactionStats, getTransactionCategories, validateTransferDetails, transferMoney } = require('../controllers/transaction.controller');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, validatePagination, validateTransaction, validateTransfer } = require('../middleware/validation');
const { apiLimiter, transactionLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use(protect, apiLimiter);

router.get('/categories', getTransactionCategories);
router.get('/stats', getTransactionStats);
router.post('/validate-transfer', validateTransfer, validateTransferDetails);
router.post('/transfer', transactionLimiter, validateTransfer, transferMoney);

router.get('/', validatePagination, getTransactions);
router.post('/', transactionLimiter, validateTransaction, createTransaction);
router.get('/admin/user/:id', authorize('admin'), validateObjectId, getUserTransactionsAdmin);

router.get('/:id', validateObjectId, getTransaction);
router.put('/:id', validateObjectId, updateTransaction);
router.delete('/:id', validateObjectId, deleteTransaction);

module.exports = router;
