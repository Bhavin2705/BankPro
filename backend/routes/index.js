const registerApiRoutes = app => {
    app.use('/api/auth', require('./auth'));
    app.use('/api/users', require('./users'));
    app.use('/api/transactions', require('./transactions'));
    app.use('/api/recurring', require('./recurring'));
    app.use('/api/bills', require('./bills'));
    app.use('/api/banks', require('./banks'));
    app.use('/api/cards', require('./cards'));
    app.use('/api/exchange', require('./exchange'));
    app.use('/api/notifications', require('./notifications'));
    app.use('/api/budgets', require('./budgets'));
    app.use('/api/settings', require('./settings'));
    app.use('/api/kyc', require('./kyc'));
    app.use('/api/admin/kyc', require('./adminKyc'));
};

module.exports = registerApiRoutes;
