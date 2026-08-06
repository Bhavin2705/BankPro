const fs = require('fs');
const http = require('http');
const path = require('path');

const STATE_FILE = path.resolve(__dirname, '..', '.jest-server-state.json');

const isServerUp = baseUrl => new Promise(resolve => {
    const req = http.get(new URL('/health', baseUrl), res => { resolve(res.statusCode === 200); res.resume(); });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
});

const waitForServer = async (baseUrl, timeoutMs = 45000) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (await isServerUp(baseUrl)) return true;
        await new Promise(r => setTimeout(r, 1000));
    }
    return false;
};

const writeState = state => fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8');
const readState = () => fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : null;
const clearState = () => { if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE); };

module.exports = { STATE_FILE, isServerUp, waitForServer, writeState, readState, clearState };
