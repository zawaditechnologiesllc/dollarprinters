'use strict';

const { verifySession } = require('./_helpers');

module.exports = function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed.' });
    }
    const payload = verifySession(req);
    if (!payload) {
        return res.status(401).json({ success: false, error: 'Unauthenticated.' });
    }
    return res.status(200).json({ success: true, user: payload.user });
};
