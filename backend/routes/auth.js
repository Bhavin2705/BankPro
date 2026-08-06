const express = require('express');
const { register, login, loginWithAccount, logout, getMe, updateDetails, updatePassword, forgotPassword, resetPassword, refreshToken, verifyResetToken } = require('../services/auth.service');
const { protect } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin, validatePasswordReset, validatePasswordResetToken, validatePasswordUpdate, validateProfileUpdate } = require('../middleware/validation');
const { apiLimiter, authLimiter, passwordResetLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, validateUserRegistration, register);
router.post('/login', authLimiter, validateUserLogin, login);
router.post('/login-account', authLimiter, validateUserLogin, loginWithAccount);
router.post('/forgotpassword', passwordResetLimiter, validatePasswordReset, forgotPassword);
router.put('/resetpassword/:resettoken', passwordResetLimiter, validatePasswordResetToken, resetPassword);
router.get('/resetpassword/:resettoken', passwordResetLimiter, verifyResetToken);
router.post('/refresh', authLimiter, refreshToken);

router.use(protect, apiLimiter);

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/updatedetails', validateProfileUpdate, updateDetails);
router.put('/updatepassword', validatePasswordUpdate, updatePassword);

module.exports = router;