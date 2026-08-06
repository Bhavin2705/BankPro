const { api } = require('../helpers/apiClient');
const { createAuthenticatedUser } = require('../helpers/authHelper');

describe('Error Handling API', () => {
    let authHeader;
    beforeAll(async () => { authHeader = (await createAuthenticatedUser()).authHeader; });

    it('returns 404 for unknown route', async () => {
        const res = await api().get('/api/route-that-does-not-exist').expect(404);
        expect(res.body.success).toBe(false);
    });

    it('returns 401 on protected route without token', async () => {
        const res = await api().get('/api/transactions').expect(401);
        expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid object id on user route', async () => {
        const res = await api().get('/api/users/invalid-id').set(authHeader).expect(400);
        expect(res.body.success).toBe(false);
    });
});
