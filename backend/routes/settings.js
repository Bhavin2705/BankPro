const express = require('express');
const {
    getSettings,
    updatePreferences,
    updateTwoFactor,
    getLinkedAccounts,
    getSessions
} = require('../controllers/settings.controller');
const { protect } = require('../middleware/auth');
const { validateSettingsPreferencesUpdate, validateTwoFactorUpdate } = require('../middleware/validation');
const { apiLimiter, settingsWriteLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use(protect);
router.use(apiLimiter);

router.get('/', getSettings);
// Preferences endpoint: payload elements (emailNotifications, smsNotifications, theme) strictly destructured; all injected parameters (isAdmin, userId, role) ignored.
router.put('/preferences', settingsWriteLimiter, validateSettingsPreferencesUpdate, updatePreferences);
router.put('/two-factor', settingsWriteLimiter, validateTwoFactorUpdate, updateTwoFactor);
router.get('/linked-accounts', getLinkedAccounts);
router.get('/sessions', getSessions);

module.exports = router;
