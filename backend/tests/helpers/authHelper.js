const { api, withAuth } = require('./apiClient');
const { buildUserPayload } = require('./testData');

const registerUser = async (overrides = {}) => {
    const payload = buildUserPayload(overrides);
    const response = await api().post('/api/auth/register').send(payload);
    const token = response.body?.token || response.body?.data?.token;
    const user = response.body?.data?.user || response.body?.data;
    if (!response.body?.success || !user || !token) {
        throw new Error(`User registration failed in test helper (status: ${response.status}). Response: ${JSON.stringify(response.body)}`);
    }
    return { payload, response, token, refreshToken: response.body?.refreshToken || response.body?.data?.refreshToken, user };
};

const loginUser = async ({ identifier, password }) => api().post('/api/auth/login').send({ identifier, password });

const createAuthenticatedUser = async (overrides = {}) => {
    const reg = await registerUser(overrides);
    const loginRes = await loginUser({ identifier: reg.payload.email, password: reg.payload.password });
    const token = loginRes.body?.token || loginRes.body?.data?.token;
    const user = loginRes.body?.data?.user || loginRes.body?.data;
    if (!loginRes.body?.success || !token) throw new Error(`User login failed in test helper: ${JSON.stringify(loginRes.body)}`);
    return { payload: reg.payload, user, token, refreshToken: loginRes.body?.refreshToken || loginRes.body?.data?.refreshToken, authHeader: withAuth(token), registrationResponse: reg.response, loginResponse: loginRes };
};

module.exports = { registerUser, loginUser, createAuthenticatedUser };
