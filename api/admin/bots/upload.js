'use strict';

const path = require('path');
const fs = require('fs');
const { verifySession } = require('../_helpers');

const MANIFEST_PATH = path.join(process.cwd(), 'public/bots/manifest.json');
const TMP_MANIFEST = '/tmp/dp-manifest.json';
const BOTS_DIR = process.env.VERCEL ? '/tmp/dp-bots' : path.join(process.cwd(), 'public/bots');

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

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed.' });
    }

    const payload = verifySession(req);
    if (!payload) return res.status(401).json({ success: false, error: 'Unauthenticated.' });

    try {
        if (!fs.existsSync(BOTS_DIR)) fs.mkdirSync(BOTS_DIR, { recursive: true });
    } catch {}

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
        return res.status(400).json({ success: false, error: 'Expected multipart/form-data.' });
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return res.status(400).json({ success: false, error: 'Missing boundary.' });

    const chunks = [];
    await new Promise((resolve, reject) => {
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', resolve);
        req.on('error', reject);
    });

    const raw = Buffer.concat(chunks).toString('binary');
    const parts = raw.split('--' + boundary);
    let fileName = null;
    let fileContent = null;
    let botName = null;
    let botDescription = null;
    let botCategory = null;
    let botIcon = null;

    for (const part of parts) {
        if (part.includes('Content-Disposition')) {
            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd === -1) continue;
            const header = part.substring(0, headerEnd);
            const body = part.substring(headerEnd + 4, part.length - 2);

            const nameMatch = header.match(/name="([^"]+)"/);
            const filenameMatch = header.match(/filename="([^"]+)"/);
            const fieldName = nameMatch ? nameMatch[1] : null;

            if (filenameMatch) {
                fileName = filenameMatch[1];
                fileContent = Buffer.from(body, 'binary');
            } else if (fieldName === 'name') botName = body.trim();
            else if (fieldName === 'description') botDescription = body.trim();
            else if (fieldName === 'category') botCategory = body.trim();
            else if (fieldName === 'icon') botIcon = body.trim();
        }
    }

    if (!fileName || !fileContent) {
        return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }
    if (!fileName.toLowerCase().endsWith('.xml')) {
        return res.status(400).json({ success: false, error: 'Only .xml files are allowed.' });
    }
    if (fileContent.length > 5 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'File too large (max 5MB).' });
    }

    const destPath = path.join(BOTS_DIR, fileName);
    try { fs.writeFileSync(destPath, fileContent); } catch (e) {
        return res.status(500).json({ success: false, error: 'Failed to save file.' });
    }

    const manifest = readManifest();
    const maxId = manifest.reduce((m, b) => Math.max(m, parseInt(b.id) || 0), 0);
    const newBot = {
        id: String(maxId + 1),
        name: botName || fileName.replace('.xml', '').replace(/_/g, ' '),
        description: botDescription || 'No description provided.',
        fileName,
        category: botCategory || 'Uncategorized',
        icon: botIcon || '🤖',
        visible: true,
    };
    manifest.push(newBot);
    writeManifest(manifest);
    return res.status(200).json({ success: true, bot: newBot });
};
