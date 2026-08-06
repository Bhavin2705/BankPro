const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

const mapNotif = n => ({
    id: n._id.toString(),
    _id: n._id.toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.status === 'read',
    priority: n.priority,
    timestamp: n.createdAt,
    createdAt: n.createdAt
});

const getNotifications = async (req, res) => {
    const notifications = await Notification.find({ userId: req.user._id, status: { $ne: 'archived' } }).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, data: notifications.map(mapNotif) });
};

const getNotification = async (req, res) => {
    const notification = await Notification.findOne({ userId: req.user._id, _id: req.params.id });
    if (!notification) {
        const error = new Error('Notification not found');
        error.statusCode = 404;
        throw error;
    }
    res.status(200).json({ success: true, data: mapNotif(notification) });
};

const markNotificationAsRead = async (req, res) => {
    const notification = await Notification.findOneAndUpdate({ userId: req.user._id, _id: req.params.id }, { status: 'read' }, { new: true });
    if (!notification) {
        const error = new Error('Notification not found');
        error.statusCode = 404;
        throw error;
    }
    res.status(200).json({ success: true, data: mapNotif(notification), message: 'Notification marked as read' });
};

const markAllNotificationsAsRead = async (req, res) => {
    await Notification.updateMany({ userId: req.user._id, status: 'unread' }, { status: 'read' });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
};

const deleteNotification = async (req, res) => {
    const deleted = await Notification.findOneAndDelete({ userId: req.user._id, _id: req.params.id });
    if (!deleted) {
        const error = new Error('Notification not found');
        error.statusCode = 404;
        throw error;
    }
    res.status(200).json({ success: true, message: 'Notification deleted' });
};

const deleteAllNotifications = async (req, res) => {
    await Notification.deleteMany({ userId: req.user._id });
    res.status(200).json({ success: true, message: 'All notifications deleted' });
};

module.exports = {
    getNotifications: asyncHandler(getNotifications),
    getNotification: asyncHandler(getNotification),
    markNotificationAsRead: asyncHandler(markNotificationAsRead),
    markAllNotificationsAsRead: asyncHandler(markAllNotificationsAsRead),
    deleteNotification: asyncHandler(deleteNotification),
    deleteAllNotifications: asyncHandler(deleteAllNotifications)
};
