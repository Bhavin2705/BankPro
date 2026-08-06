const request = require('supertest');
const path = require('path');
const fs = require('fs');

const STATE_FILE = path.resolve(__dirname, '..', '.jest-server-state.json');

const resolveBaseUrl = () => {
    if (process.env.TEST_BASE_URL) return process.env.TEST_BASE_URL;
    try {
        if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))?.baseUrl || 'http://127.0.0.1:5055';
    } catch (_) {}
    return 'http://127.0.0.1:5055';
};

module.exports = { api: () => request(resolveBaseUrl()), withAuth: token => ({ Authorization: `Bearer ${token}` }) };
