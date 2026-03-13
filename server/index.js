'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.ADMIN_API_PORT || 3001;

const SESSION_EXPIRY_SECONDS = 60 * 60 * 24;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
    console.warn('[admin-server] WARNING: ADMIN_USER or ADMIN_PASS env vars are not set. Login will always fail.');
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
    validate: { xForwardedForHeader: false },
});

function timingSafeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) {
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

function setAuthCookie(res, token) {
    res.cookie('admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: SESSION_EXPIRY_SECONDS * 1000,
        path: '/',
    });
}

function verifySession(req) {
    const token = req.cookies?.admin_session;
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

app.post('/api/admin/login', loginLimiter, (req, res) => {
    const { username, password } = req.body || {};

    if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
        return res.status(500).json({ success: false, error: 'Server misconfiguration: admin credentials not set.' });
    }

    if (
        !username ||
        !password ||
        !timingSafeEqual(username, process.env.ADMIN_USER) ||
        !timingSafeEqual(password, process.env.ADMIN_PASS)
    ) {
        return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ role: 'admin', user: process.env.ADMIN_USER }, JWT_SECRET, {
        expiresIn: SESSION_EXPIRY_SECONDS,
    });

    setAuthCookie(res, token);
    return res.json({ success: true });
});

app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('admin_session', { path: '/' });
    return res.json({ success: true });
});

app.get('/api/admin/verify', (req, res) => {
    const payload = verifySession(req);
    if (!payload) {
        return res.status(401).json({ success: false, error: 'Unauthenticated.' });
    }
    return res.json({ success: true, user: payload.user });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[admin-server] API server running on port ${PORT}`);
});
