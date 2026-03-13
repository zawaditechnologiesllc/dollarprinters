'use strict';

const path = require('path');
const fs = require('fs');
const { verifySession } = require('../_helpers');

const MANIFEST_PATH = path.join(process.cwd(), 'public/bots/manifest.json');
const TMP_MANIFEST = '/tmp/dp-manifest.json';
const BOTS_DIR = path.join(process.cwd(), 'public/bots');

function readManifest() {
    if (fs.existsSync(TMP_MANIFEST)) {
        try { return JSON.parse(fs.readFileSync(TMP_MANIFEST, 'utf8')); } catch {}
    }
    try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch {}
    return [];
}

function writeManifest(data) {
    const json = JSON.stringify(data, null, 2);
    try { fs.writeFileSync(TMP_MANIFEST, json, 'utf8'); } catch {}
    if (!process.env.VERCEL) {
        try { fs.writeFileSync(MANIFEST_PATH, json, 'utf8'); } catch {}
    }
}

module.exports = function handler(req, res) {
    const payload = verifySession(req);
    if (!payload) return res.status(401).json({ success: false, error: 'Unauthenticated.' });

    const id = req.query.id;

    if (req.method === 'PUT') {
        const manifest = readManifest();
        const idx = manifest.findIndex(b => b.id === id);
        if (idx === -1) return res.status(404).json({ success: false, error: 'Bot not found.' });
        const { name, description, category, icon, visible } = req.body || {};
        if (name !== undefined) manifest[idx].name = String(name).trim();
        if (description !== undefined) manifest[idx].description = String(description).trim();
        if (category !== undefined) manifest[idx].category = String(category).trim();
        if (icon !== undefined) manifest[idx].icon = String(icon).trim();
        if (visible !== undefined) manifest[idx].visible = Boolean(visible);
        writeManifest(manifest);
        return res.status(200).json({ success: true, bot: manifest[idx] });
    }

    if (req.method === 'DELETE') {
        const manifest = readManifest();
        const idx = manifest.findIndex(b => b.id === id);
        if (idx === -1) return res.status(404).json({ success: false, error: 'Bot not found.' });
        const [removed] = manifest.splice(idx, 1);
        writeManifest(manifest);
        if (!process.env.VERCEL) {
            const xmlPath = path.join(BOTS_DIR, removed.fileName);
            try { if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath); } catch {}
        }
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed.' });
};
