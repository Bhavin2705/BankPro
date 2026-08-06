const User = require('../models/User');
const { createInAppNotification } = require('../utils/notifications');

const getMe = async (req, res) => {
    try {
        res.status(200).json({ success: true, data: await User.findById(req.user._id) });
    } catch { res.status(500).json({ success: false, error: 'Server error getting user data' }); }
};

const updateDetails = async (req, res) => {
    try {
        const addr = req.body.address === undefined ? undefined : req.body.address === null ? { street: '' } : typeof req.body.address === 'string' ? { street: req.body.address.trim() } : req.body.address;
        const raw = {
            name: req.body.name, email: req.body.email, phone: req.body.phone,
            'profile.dateOfBirth': req.body.dateOfBirth, 'profile.address': addr, 'profile.occupation': req.body.occupation, 'profile.income': req.body.income,
            'preferences.currency': req.body.currency, 'preferences.language': req.body.language, 'preferences.theme': req.body.theme,
            'bankDetails.bankName': req.body.bankName, 'bankDetails.ifscCode': req.body.ifscCode, 'bankDetails.branchName': req.body.branchName
        };

        const updateData = {};
        Object.entries(raw).forEach(([k, v]) => { if (v !== undefined) updateData[k] = v; });

        const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true });
        await createInAppNotification({ userId: req.user._id, type: 'account_update', title: 'Profile Updated', message: 'Your profile details were updated successfully.', priority: 'low', metadata: { category: 'settings' } });

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        if (error.name === 'ValidationError') return res.status(400).json({ success: false, error: Object.values(error.errors || {}).map(e => e.message).join(', ') || 'Invalid profile details' });
        if (error.code === 11000) return res.status(400).json({ success: false, error: 'Email already registered' });
        res.status(500).json({ success: false, error: 'Server error updating user details' });
    }
};

module.exports = { getMe, updateDetails };
