const express = require('express');
const { protect } = require('../middleware/auth');
const { validateBudget, validateObjectId } = require('../middleware/validation');
const { apiLimiter, transactionLimiter } = require('../middleware/rateLimit');
const { getBudgets, getBudget, getBudgetSummary, createBudget, updateBudget, deleteBudget, updateBudgetSpent, getBudgetStats } = require('../controllers/budget.controller');

const router = express.Router();
router.use(protect, apiLimiter);

router.get('/', getBudgets);
router.get('/summary', getBudgetSummary);
router.get('/stats', getBudgetStats);
router.get('/:id', validateObjectId, getBudget);
router.post('/', transactionLimiter, validateBudget, createBudget);
router.post('/:id/update-spent', transactionLimiter, validateObjectId, updateBudgetSpent);
router.put('/:id', validateObjectId, validateBudget, updateBudget);
router.delete('/:id', validateObjectId, deleteBudget);

module.exports = router;
