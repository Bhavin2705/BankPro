const emailService = require('./email');
const { createInAppNotification } = require('../utils/notifications');

const createNotification = async payload => Boolean(await createInAppNotification(payload));

const sendTransactionEmailIfEnabled = ({ user, details }) => {
    if (user?.preferences?.notifications?.email !== false) {
        emailService.sendTransactionNotification(user.email, details).catch(() => {});
    }
    return false;
};

module.exports = { createNotification, sendTransactionEmailIfEnabled };
