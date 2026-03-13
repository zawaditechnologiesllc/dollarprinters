'use strict';

const { clearAuthCookie } = require('./_helpers');

module.exports = function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed.' });
    }
    clearAuthCookie(res);
    return res.status(200).json({ success: true });
};
