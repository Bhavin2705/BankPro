const express = require('express');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const { validateObjectId } = require('../middleware/validation');
const {
    getNotifications,
    getNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications
} = require('../controllers/notification.controller');

const router = express.Router();
router.use(protect, apiLimiter);

router.get('/', getNotifications);
router.put('/read-all', markAllNotificationsAsRead);
router.post('/mark-all-read', markAllNotificationsAsRead);
router.delete('/', deleteAllNotifications);

router.get('/:id', validateObjectId, getNotification);
router.put('/:id/read', validateObjectId, markNotificationAsRead);
router.delete('/:id', validateObjectId, deleteNotification);

module.exports = router;
