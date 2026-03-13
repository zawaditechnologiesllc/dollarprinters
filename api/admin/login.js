'use strict';

const { timingSafeEqual, setAuthCookie, createToken } = require('./_helpers');

const attemptMap = new Map();

function getRateLimitKey(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(key) {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const max = 5;
    const entry = attemptMap.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + windowMs;
    }

    if (entry.count >= max) return false;

    entry.count += 1;
    attemptMap.set(key, entry);
    return true;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed.' });
    }

    const key = getRateLimitKey(req);
    if (!checkRateLimit(key)) {
        return res.status(429).json({ success: false, error: 'Too many login attempts. Please try again in 15 minutes.' });
    }

    if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
        return res.status(500).json({ success: false, error: 'Server misconfiguration: admin credentials not set.' });
    }

    const { username, password } = req.body || {};

    if (
        !username ||
        !password ||
        !timingSafeEqual(username, process.env.ADMIN_USER) ||
        !timingSafeEqual(password, process.env.ADMIN_PASS)
    ) {
        return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ success: false, error: 'Server misconfiguration: JWT_SECRET is not set.' });
    }
    const token = createToken(process.env.ADMIN_USER);
    if (!token) {
        return res.status(500).json({ success: false, error: 'Server misconfiguration: failed to create session.' });
    }
    setAuthCookie(res, token);
    return res.status(200).json({ success: true });
};
