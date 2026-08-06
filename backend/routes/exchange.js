const express = require('express');
const axios = require('axios');
const redis = require('../config/redis');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const REDIS_EXCHANGE_KEY = 'bank:exchange:rates';
const CACHE_TTL_SEC = Math.max(5, Math.floor((parseInt(process.env.EXCHANGE_CACHE_TTL_MS, 10) || 60000) / 1000));
const FALLBACK_RATES = Object.freeze({ USD: 1, EUR: 0.92, GBP: 0.79, JPY: 148.7, CAD: 1.35, AUD: 1.52, CHF: 0.89, CNY: 7.23, INR: 83.1, BRL: 4.98 });

const fetchRates = async () => {
    const now = Date.now();
    const redisCache = await redis.cacheGetJson(REDIS_EXCHANGE_KEY);
    if (redisCache && redisCache.rates) {
        return { success: true, source: 'redis-cache', timestamp: redisCache.timestamp, rates: redisCache.rates };
    }

    const appId = String(process.env.OPEN_EXCHANGE_RATES_API_KEY || '').trim();
    if (!appId) return { success: true, source: 'fallback-static', timestamp: now, rates: FALLBACK_RATES };

    try {
        const res = await axios.get(`https://openexchangerates.org/api/latest.json?app_id=${appId}`, { timeout: 10000 });
        if (!res.data?.rates) throw new Error('Invalid response');
        const rates = res.data.rates;
        await redis.cacheSetJson(REDIS_EXCHANGE_KEY, { rates, timestamp: now }, CACHE_TTL_SEC);
        return { success: true, source: 'upstream', timestamp: now, rates };
    } catch {
        return { success: true, source: 'fallback-static', timestamp: now, rates: FALLBACK_RATES };
    }
};

router.get('/rates', apiLimiter, async (req, res) => res.json(await fetchRates()));

router.post('/convert', apiLimiter, async (req, res) => {
    // Destructure ONLY the three permitted fields — any client-supplied exchangeRate, fee,
    // rate, convertedAmount etc. are completely ignored. Rate is always fetched server-side.
    const { amount, from, to } = req.body || {};
    const amt = Number(amount);
    const fromC = String(from || '').toUpperCase().trim();
    const toC = String(to || '').toUpperCase().trim();

    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
    if (amt > 10_000_000) return res.status(400).json({ success: false, error: 'Amount exceeds maximum allowed conversion limit' });
    if (!fromC || !toC) return res.status(400).json({ success: false, error: 'Invalid payload: from and to currency codes are required' });
    if (fromC === toC) return res.status(200).json({ success: true, data: { amount: amt, from: fromC, to: toC, convertedAmount: amt, rate: 1 } });

    // Rate fetched exclusively server-side — client cannot influence this value
    const result = await fetchRates();
    const fromRate = result.rates[fromC], toRate = result.rates[toC];
    if (!fromRate || !toRate) return res.status(400).json({ success: false, error: 'Unsupported currency code' });

    const serverRate = toRate / fromRate;
    const convertedAmount = (amt / fromRate) * toRate;

    res.status(200).json({
        success: true,
        source: result.source,
        timestamp: result.timestamp,
        data: { amount: amt, from: fromC, to: toC, convertedAmount, rate: serverRate }
    });
});

module.exports = router;
