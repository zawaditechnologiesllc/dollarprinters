'use strict';

const path = require('path');
const fs = require('fs');
const { verifySession } = require('../_helpers');

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

    const id = req.query.id;

    if (req.method === 'PUT') {
        const list = readAnnouncements();
        const idx = list.findIndex(a => a.id === id);
        if (idx === -1) return res.status(404).json({ success: false, error: 'Announcement not found.' });
        const { title, message, type, active } = req.body || {};
        if (title !== undefined) list[idx].title = String(title).trim();
        if (message !== undefined) list[idx].message = String(message).trim();
        if (type !== undefined && ['info', 'warning', 'success'].includes(type)) list[idx].type = type;
        if (active !== undefined) list[idx].active = Boolean(active);
        writeAnnouncements(list);
        return res.status(200).json({ success: true, announcement: list[idx] });
    }

    if (req.method === 'DELETE') {
        const list = readAnnouncements();
        const idx = list.findIndex(a => a.id === id);
        if (idx === -1) return res.status(404).json({ success: false, error: 'Announcement not found.' });
        list.splice(idx, 1);
        writeAnnouncements(list);
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed.' });
};
