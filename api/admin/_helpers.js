'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const SESSION_EXPIRY_SECONDS = 60 * 60 * 24;

function getJwtSecret() {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET env var is not set.');
    }
    return process.env.JWT_SECRET;
}

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
    res.setHeader(
        'Set-Cookie',
        `admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_EXPIRY_SECONDS}; Path=/`
    );
}

function clearAuthCookie(res) {
    res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/');
}

function parseCookies(req) {
    const cookieHeader = req.headers.cookie || '';
    return Object.fromEntries(
        cookieHeader.split(';').map(c => {
            const [k, ...v] = c.trim().split('=');
            return [k, decodeURIComponent(v.join('='))];
        })
    );
}

function verifySession(req) {
    const cookies = parseCookies(req);
    const token = cookies.admin_session;
    if (!token) return null;
    try {
        return jwt.verify(token, getJwtSecret());
    } catch {
        return null;
    }
}

function createToken(username) {
    return jwt.sign({ role: 'admin', user: username }, getJwtSecret(), {
        expiresIn: SESSION_EXPIRY_SECONDS,
    });
}

module.exports = { timingSafeEqual, setAuthCookie, clearAuthCookie, verifySession, createToken };
