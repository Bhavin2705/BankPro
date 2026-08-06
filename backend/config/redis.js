const { Redis } = require('@upstash/redis');

class InMemoryFallbackCache {
    constructor() {
        this.store = new Map();
    }

    _isExpired(entry) {
        return entry.expireAt !== null && Date.now() > entry.expireAt;
    }

    async get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (this._isExpired(entry)) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    async set(key, value, opts = {}) {
        let expireAt = null;
        if (opts.ex || opts.EX) {
            expireAt = Date.now() + (opts.ex || opts.EX) * 1000;
        } else if (opts.px || opts.PX) {
            expireAt = Date.now() + (opts.px || opts.PX);
        }
        this.store.set(key, { value: String(value), expireAt });
        return 'OK';
    }

    async del(...keys) {
        let count = 0;
        for (const k of keys.flat()) {
            if (this.store.delete(k)) count++;
        }
        return count;
    }

    async incr(key) {
        const currentVal = await this.get(key);
        const nextVal = (parseInt(currentVal, 10) || 0) + 1;
        const entry = this.store.get(key);
        const expireAt = entry ? entry.expireAt : null;
        this.store.set(key, { value: String(nextVal), expireAt });
        return nextVal;
    }

    async expire(key, seconds) {
        const entry = this.store.get(key);
        if (!entry || this._isExpired(entry)) return 0;
        entry.expireAt = Date.now() + seconds * 1000;
        return 1;
    }
}

class RedisManager {
    constructor() {
        this.client = null;
        this.fallback = new InMemoryFallbackCache();
        this.isUpstashConfigured = false;
        this.init();
    }

    init() {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (url && token && !url.includes('placeholder') && !token.includes('placeholder')) {
            try {
                this.client = new Redis({ url, token });
                this.isUpstashConfigured = true;
            } catch (err) {
                console.warn('[Redis] Failed to initialize Upstash client, falling back to in-memory cache:', err.message);
                this.client = null;
                this.isUpstashConfigured = false;
            }
        } else {
            this.client = null;
            this.isUpstashConfigured = false;
        }
    }

    async get(key) {
        if (this.isUpstashConfigured && this.client) {
            try {
                const val = await this.client.get(key);
                if (val === null || val === undefined) return null;
                return typeof val === 'object' ? JSON.stringify(val) : String(val);
            } catch (err) {
                console.warn(`[Redis] Get failed for key "${key}", using fallback:`, err.message);
                return this.fallback.get(key);
            }
        }
        return this.fallback.get(key);
    }

    async set(key, value, opts = {}) {
        const stringVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (this.isUpstashConfigured && this.client) {
            try {
                await this.client.set(key, stringVal, opts);
                return 'OK';
            } catch (err) {
                console.warn(`[Redis] Set failed for key "${key}", using fallback:`, err.message);
                return this.fallback.set(key, stringVal, opts);
            }
        }
        return this.fallback.set(key, stringVal, opts);
    }

    async del(...keys) {
        const flatKeys = keys.flat();
        if (this.isUpstashConfigured && this.client) {
            try {
                return await this.client.del(...flatKeys);
            } catch (err) {
                console.warn(`[Redis] Del failed for keys "${flatKeys.join(', ')}", using fallback:`, err.message);
                return this.fallback.del(...flatKeys);
            }
        }
        return this.fallback.del(...flatKeys);
    }

    async incr(key) {
        if (this.isUpstashConfigured && this.client) {
            try {
                return await this.client.incr(key);
            } catch (err) {
                console.warn(`[Redis] Incr failed for key "${key}", using fallback:`, err.message);
                return this.fallback.incr(key);
            }
        }
        return this.fallback.incr(key);
    }

    async expire(key, seconds) {
        if (this.isUpstashConfigured && this.client) {
            try {
                return await this.client.expire(key, seconds);
            } catch (err) {
                console.warn(`[Redis] Expire failed for key "${key}", using fallback:`, err.message);
                return this.fallback.expire(key, seconds);
            }
        }
        return this.fallback.expire(key, seconds);
    }

    async cacheGetJson(key) {
        const raw = await this.get(key);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }

    async cacheSetJson(key, data, ttlSeconds = 300) {
        return this.set(key, JSON.stringify(data), { ex: ttlSeconds });
    }

    getStatus() {
        return {
            configured: this.isUpstashConfigured,
            provider: this.isUpstashConfigured ? 'upstash-redis' : 'in-memory-fallback',
            url: this.isUpstashConfigured ? (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/\/.*@/, '//***@') : null
        };
    }
}

const redisManager = new RedisManager();
module.exports = redisManager;
