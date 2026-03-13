'use strict';

const path = require('path');
const fs = require('fs');
const { verifySession } = require('./_helpers');

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

    if (req.method === 'GET') {
        const manifest = readManifest();
        let files = [];
        try { files = fs.readdirSync(BOTS_DIR).filter(f => f.endsWith('.xml')); } catch {}
        const manifestFileNames = manifest.map(b => b.fileName);
        const untracked = files.filter(f => !manifestFileNames.includes(f));
        return res.status(200).json({ success: true, bots: manifest, untrackedFiles: untracked });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed.' });
};
