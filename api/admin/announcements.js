'use strict';

const path = require('path');
const fs = require('fs');
const { verifySession } = require('./_helpers');

const ANNOUNCEMENTS_PATH = path.join(process.cwd(), 'public/announcements.json');
const TMP_ANNOUNCEMENTS = '/tmp/dp-announcements.json';

function readAnnouncements() {
    if (fs.existsSync(TMP_ANNOUNCEMENTS)) {
        try { return JSON.parse(fs.readFileSync(TMP_ANNOUNCEMENTS, 'utf8')); } catch {}
    }
    if (fs.existsSync(ANNOUNCEMENTS_PATH)) {
        try { return JSON.parse(fs.readFileSync(ANNOUNCEMENTS_PATH, 'utf8')); } catch {}
    }
    return [];
}

function writeAnnouncements(data) {
    const json = JSON.stringify(data, null, 2);
    try { fs.writeFileSync(TMP_ANNOUNCEMENTS, json, 'utf8'); } catch {}
    if (!process.env.VERCEL) {
        try { fs.writeFileSync(ANNOUNCEMENTS_PATH, json, 'utf8'); } catch {}
    }
}

module.exports = function handler(req, res) {
    const payload = verifySession(req);
    if (!payload) return res.status(401).json({ success: false, error: 'Unauthenticated.' });

    if (req.method === 'GET') {
        const list = readAnnouncements();
        return res.status(200).json({ success: true, announcements: list });
    }

    if (req.method === 'POST') {
        const list = readAnnouncements();
        const { title, message, type } = req.body || {};
        if (!title || !message) return res.status(400).json({ success: false, error: 'title and message are required.' });
        const maxId = list.reduce((m, a) => Math.max(m, parseInt(a.id) || 0), 0);
        const newItem = {
            id: String(maxId + 1),
            title: String(title).trim(),
            message: String(message).trim(),
            type: ['info', 'warning', 'success'].includes(type) ? type : 'info',
            createdAt: new Date().toISOString(),
            active: true,
        };
        list.push(newItem);
        writeAnnouncements(list);
        return res.status(200).json({ success: true, announcement: newItem });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed.' });
};
