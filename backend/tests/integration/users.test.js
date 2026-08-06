const { api } = require('../helpers/apiClient');
const { createAuthenticatedUser, registerUser } = require('../helpers/authHelper');

describe('User API', () => {
    let authHeader, userId, email, pin;

    beforeAll(async () => {
        const account = await createAuthenticatedUser();
        authHeader = account.authHeader; userId = account.user._id; email = account.payload.email; pin = account.payload.pin;
        await registerUser();
    });

    it('rejects regular user access to users list', async () => {
        const res = await api().get('/api/users').set(authHeader).expect(403);
        expect(res.body.success).toBe(false);
    });

    it('returns own profile by id', async () => {
        const res = await api().get(`/api/users/${userId}`).set(authHeader).expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data._id).toBe(userId);
    });

    it('updates own profile', async () => {
        const res = await api().put(`/api/users/${userId}`).set(authHeader).send({ name: 'Profile Updated User' }).expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Profile Updated User');
    });

    it('checks email existence for registered email', async () => {
        const res = await api().get('/api/users/check-email').query({ email }).expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.exists).toBe(true);
    });

    it('validates pin for authenticated user', async () => {
        const res = await api().post('/api/users/verify-pin').set(authHeader).send({ pin }).expect(200);
        expect(res.body.success).toBe(true);
    });

    it('returns transfer recipients list', async () => {
        const res = await api().get('/api/users/transfer-recipients').set(authHeader).expect(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});
