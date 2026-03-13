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

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed.' });
    }

    const payload = verifySession(req);
    if (!payload) return res.status(401).json({ success: false, error: 'Unauthenticated.' });

    const envCheck = {
        ADMIN_USER: !!process.env.ADMIN_USER,
        ADMIN_PASS: !!process.env.ADMIN_PASS,
        JWT_SECRET: !!process.env.JWT_SECRET,
    };

    let derivStatus = 'unknown';
    let derivLatency = null;
    try {
        const WebSocket = (await import('ws').catch(() => null))?.WebSocket || (await import('ws').catch(() => null))?.default;
        if (WebSocket) {
            await new Promise(resolve => {
                const t0 = Date.now();
                const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1');
                ws.on('open', () => { derivLatency = Date.now() - t0; derivStatus = 'connected'; ws.close(); resolve(); });
                ws.on('error', () => { derivStatus = 'error'; resolve(); });
                setTimeout(() => { derivStatus = 'timeout'; try { ws.terminate(); } catch {} resolve(); }, 4000);
            });
        }
    } catch {
        derivStatus = 'error';
    }

    const manifest = readManifest();
    let files = [];
    try { files = fs.readdirSync(BOTS_DIR).filter(f => f.endsWith('.xml')); } catch {}

    const mem = process.memoryUsage();

    return res.status(200).json({
        success: true,
        uptime: process.uptime(),
        nodeVersion: process.version,
        memory: {
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
            rss: Math.round(mem.rss / 1024 / 1024),
        },
        env: envCheck,
        derivApi: { status: derivStatus, latencyMs: derivLatency },
        bots: { inManifest: manifest.length, xmlFilesOnDisk: files.length, visible: manifest.filter(b => b.visible).length },
    });
};
