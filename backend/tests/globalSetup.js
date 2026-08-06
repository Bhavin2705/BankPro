const path = require('path');
const { spawn } = require('child_process');
const { isServerUp, waitForServer, writeState } = require('./helpers/serverControl');

module.exports = async () => {
    const testPort = process.env.TEST_PORT || '5055';
    const baseUrl = process.env.TEST_BASE_URL || `http://127.0.0.1:${testPort}`;
    if (await isServerUp(baseUrl)) { writeState({ managed: false, baseUrl }); return; }

    const child = spawn(process.execPath, ['server.js'], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, PORT: String(new URL(baseUrl).port || testPort), NODE_ENV: process.env.NODE_ENV || 'test' },
        detached: true, stdio: 'ignore'
    });
    child.unref();

    if (!await waitForServer(baseUrl)) throw new Error(`Backend server did not start within timeout at ${baseUrl}`);
    writeState({ managed: true, baseUrl, pid: child.pid });
};
