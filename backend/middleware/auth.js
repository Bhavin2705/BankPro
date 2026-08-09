const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isTokenBlacklisted } = require('../utils/auth');

const protect = async (req, res, next) => {
    try {
        let token = req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : req.cookies?.token;
        if (!token) return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
        if (await isTokenBlacklisted(token)) return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
        if (!process.env.JWT_SECRET) return res.status(500).json({ success: false, error: 'Authentication is not configured' });

        let decoded;
        try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
        catch { return res.status(401).json({ success: false, error: 'Not authorized to access this route' }); }
        if (decoded.tokenType !== 'access') return res.status(401).json({ success: false, error: 'Not authorized to access this route' });

        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ success: false, error: 'No user found with this token' });
        if (['suspended', 'inactive'].includes(user.status)) return res.status(403).json({ success: false, error: 'Your account has been blocked by admin.' });

        req.user = user;
        req.userId = user._id ? user._id.toString() : undefined;
        next();
    } catch { res.status(500).json({ success: false, error: 'Server error in authentication' }); }
};

const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, error: `User role ${req.user.role} is not authorized to access this route` });
    next();
};

const resourceOwner = modelName => async (req, res, next) => {
    try {
        const Model = require(`../models/${modelName}`);
        const resource = await Model.findById(req.params.id);
        if (!resource) return res.status(404).json({ success: false, error: `${modelName} not found` });
        if (resource.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized to access this resource' });
        }
        req.resource = resource;
        next();
    } catch { res.status(500).json({ success: false, error: 'Server error checking resource ownership' }); }
};

module.exports = { protect, authorize, resourceOwner };
