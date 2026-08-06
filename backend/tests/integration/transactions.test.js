const { api } = require('../helpers/apiClient');
const { createAuthenticatedUser, registerUser } = require('../helpers/authHelper');

describe('Transaction API', () => {
    let authHeader, recipientAccount;

    beforeAll(async () => {
        const account = await createAuthenticatedUser({ initialDeposit: 5000 });
        authHeader = account.authHeader;
        const recipient = await registerUser({ initialDeposit: 1000 });
        recipientAccount = recipient.user.accountNumber;
    });

    it('returns transaction categories', async () => {
        const res = await api().get('/api/transactions/categories').set(authHeader).expect(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns transaction list', async () => {
        const res = await api().get('/api/transactions').set(authHeader).expect(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns transaction stats', async () => {
        const res = await api().get('/api/transactions/stats').set(authHeader).expect(200);
        expect(res.body.success).toBe(true);
    });

    it('validates transfer details for recipient account', async () => {
        const res = await api().post('/api/transactions/validate-transfer').set(authHeader).send({ recipientAccount, amount: 100, description: 'Transfer preview' }).expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('hasSufficientBalance');
    });

    it('returns validation error for invalid transaction payload', async () => {
        const res = await api().post('/api/transactions').set(authHeader).send({ type: 'credit', amount: 0, description: '' }).expect(400);
        expect(res.body.success).toBe(false);
    });

    it('rejects self transfer in transfer validation', async () => {
        const me = await api().get('/api/auth/me').set(authHeader).expect(200);
        const res = await api().post('/api/transactions/validate-transfer').set(authHeader).send({ recipientAccount: me.body.data.accountNumber, amount: 10, description: 'Self transfer attempt' }).expect(400);
        expect(res.body.success).toBe(false);
    });

    it('creates a credit transaction', async () => {
        const res = await api().post('/api/transactions').set(authHeader).send({ type: 'credit', amount: 500, description: 'Test deposit transaction', category: 'deposit' }).expect(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.amount).toBe(500);
    });

    it('transfers money to another account', async () => {
        const res = await api().post('/api/transactions/transfer').set(authHeader).send({ recipientAccount, amount: 100, description: 'Internal transfer test' }).expect(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.transferAmount).toBe(100);
    });

    it('returns 400 for invalid transaction id format', async () => {
        const res = await api().get('/api/transactions/invalid-id').set(authHeader).expect(400);
        expect(res.body.success).toBe(false);
    });
});
