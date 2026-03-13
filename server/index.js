'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.ADMIN_API_PORT || 3001;

const SESSION_EXPIRY_SECONDS = 60 * 60 * 24;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

const MANIFEST_PATH = path.join(__dirname, '../public/bots/manifest.json');
const BOTS_DIR = path.join(__dirname, '../public/bots');
const ANALYTICS_PATH = path.join(__dirname, 'analytics.json');
const ANNOUNCEMENTS_PATH = path.join(__dirname, '../public/announcements.json');

if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
    console.warn('[admin-server] WARNING: ADMIN_USER or ADMIN_PASS env vars are not set.');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function readJson(filePath, fallback) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return fallback;
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
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

function requireAuth(req, res, next) {
    if (!verifySession(req)) {
        return res.status(401).json({ success: false, error: 'Unauthenticated.' });
    }
    next();
}

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, BOTS_DIR),
        filename: (req, file, cb) => cb(null, file.originalname),
    }),
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() !== '.xml') {
            return cb(new Error('Only .xml files are allowed'));
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});

// ─── Auth Routes ─────────────────────────────────────────────────────────────

app.post('/api/admin/login', loginLimiter, (req, res) => {
    const { username, password } = req.body || {};
    if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
        return res.status(500).json({ success: false, error: 'Server misconfiguration: credentials not set.' });
    }
    if (
        !username || !password ||
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
    if (!payload) return res.status(401).json({ success: false, error: 'Unauthenticated.' });
    return res.json({ success: true, user: payload.user });
});

// ─── Bot Management ──────────────────────────────────────────────────────────

app.get('/api/admin/bots', requireAuth, (req, res) => {
    const manifest = readJson(MANIFEST_PATH, []);
    const files = fs.readdirSync(BOTS_DIR).filter(f => f.endsWith('.xml'));
    const manifestFileNames = manifest.map(b => b.fileName);
    const untracked = files.filter(f => !manifestFileNames.includes(f));
    return res.json({ success: true, bots: manifest, untrackedFiles: untracked });
});

app.put('/api/admin/bots/:id', requireAuth, (req, res) => {
    const manifest = readJson(MANIFEST_PATH, []);
    const idx = manifest.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Bot not found.' });
    const { name, description, category, icon, visible } = req.body;
    if (name !== undefined) manifest[idx].name = String(name).trim();
    if (description !== undefined) manifest[idx].description = String(description).trim();
    if (category !== undefined) manifest[idx].category = String(category).trim();
    if (icon !== undefined) manifest[idx].icon = String(icon).trim();
    if (visible !== undefined) manifest[idx].visible = Boolean(visible);
    writeJson(MANIFEST_PATH, manifest);
    return res.json({ success: true, bot: manifest[idx] });
});

app.delete('/api/admin/bots/:id', requireAuth, (req, res) => {
    const manifest = readJson(MANIFEST_PATH, []);
    const idx = manifest.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Bot not found.' });
    const [removed] = manifest.splice(idx, 1);
    writeJson(MANIFEST_PATH, manifest);
    const xmlPath = path.join(BOTS_DIR, removed.fileName);
    if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath);
    return res.json({ success: true });
});

app.post('/api/admin/bots/upload', requireAuth, (req, res) => {
    upload.single('file')(req, res, err => {
        if (err) return res.status(400).json({ success: false, error: err.message });
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded.' });

        const manifest = readJson(MANIFEST_PATH, []);
        const { name, description, category, icon } = req.body;
        const maxId = manifest.reduce((m, b) => Math.max(m, parseInt(b.id) || 0), 0);
        const newBot = {
            id: String(maxId + 1),
            name: name || req.file.originalname.replace('.xml', '').replace(/_/g, ' '),
            description: description || 'No description provided.',
            fileName: req.file.originalname,
            category: category || 'Uncategorized',
            icon: icon || '🤖',
            visible: true,
        };
        manifest.push(newBot);
        writeJson(MANIFEST_PATH, manifest);
        return res.json({ success: true, bot: newBot });
    });
});

// ─── Analytics ───────────────────────────────────────────────────────────────

app.post('/api/analytics/track', (req, res) => {
    const { page, botId } = req.body || {};
    const analytics = readJson(ANALYTICS_PATH, { pageViews: {}, dailyVisitors: {}, botLoads: {} });
    const today = todayKey();

    if (page) {
        analytics.pageViews[page] = (analytics.pageViews[page] || 0) + 1;
        if (!analytics.dailyVisitors[today]) analytics.dailyVisitors[today] = {};
        analytics.dailyVisitors[today][page] = (analytics.dailyVisitors[today][page] || 0) + 1;
    }

    if (botId) {
        analytics.botLoads[botId] = (analytics.botLoads[botId] || 0) + 1;
    }

    writeJson(ANALYTICS_PATH, analytics);
    return res.json({ success: true });
});

app.get('/api/admin/analytics', requireAuth, (req, res) => {
    const analytics = readJson(ANALYTICS_PATH, { pageViews: {}, dailyVisitors: {}, botLoads: {} });
    const manifest = readJson(MANIFEST_PATH, []);

    const today = todayKey();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const dayData = analytics.dailyVisitors[key] || {};
        last7Days.push({ date: key, views: Object.values(dayData).reduce((s, v) => s + v, 0) });
    }

    const botLoadsWithNames = Object.entries(analytics.botLoads)
        .map(([id, count]) => {
            const bot = manifest.find(b => b.id === id);
            return { id, name: bot?.name || `Bot #${id}`, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const todayTotal = Object.values(analytics.dailyVisitors[today] || {}).reduce((s, v) => s + v, 0);
    const totalViews = Object.values(analytics.pageViews).reduce((s, v) => s + v, 0);

    return res.json({
        success: true,
        totalPageViews: totalViews,
        todayViews: todayTotal,
        last7Days,
        topBots: botLoadsWithNames,
        pageBreakdown: analytics.pageViews,
    });
});

// ─── System Status ────────────────────────────────────────────────────────────

app.get('/api/admin/system', requireAuth, async (req, res) => {
    const startTime = process.hrtime();

    const envCheck = {
        ADMIN_USER: !!process.env.ADMIN_USER,
        ADMIN_PASS: !!process.env.ADMIN_PASS,
        JWT_SECRET: !!process.env.JWT_SECRET,
    };

    let derivStatus = 'unknown';
    let derivLatency = null;
    try {
        const { WebSocket } = await import('ws').catch(() => ({ WebSocket: null }));
        if (WebSocket) {
            await new Promise((resolve) => {
                const t0 = Date.now();
                const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1');
                ws.on('open', () => {
                    derivLatency = Date.now() - t0;
                    derivStatus = 'connected';
                    ws.close();
                    resolve();
                });
                ws.on('error', () => { derivStatus = 'error'; resolve(); });
                setTimeout(() => { derivStatus = 'timeout'; ws.terminate(); resolve(); }, 4000);
            });
        }
    } catch {
        derivStatus = 'error';
    }

    const manifest = readJson(MANIFEST_PATH, []);
    const files = fs.readdirSync(BOTS_DIR).filter(f => f.endsWith('.xml'));

    const uptimeSeconds = process.uptime();
    const mem = process.memoryUsage();

    return res.json({
        success: true,
        uptime: uptimeSeconds,
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
});

// ─── Announcements ────────────────────────────────────────────────────────────

app.get('/api/admin/announcements', requireAuth, (req, res) => {
    const list = readJson(ANNOUNCEMENTS_PATH, []);
    return res.json({ success: true, announcements: list });
});

app.post('/api/admin/announcements', requireAuth, (req, res) => {
    const list = readJson(ANNOUNCEMENTS_PATH, []);
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
    writeJson(ANNOUNCEMENTS_PATH, list);
    return res.json({ success: true, announcement: newItem });
});

app.put('/api/admin/announcements/:id', requireAuth, (req, res) => {
    const list = readJson(ANNOUNCEMENTS_PATH, []);
    const idx = list.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Announcement not found.' });
    const { title, message, type, active } = req.body || {};
    if (title !== undefined) list[idx].title = String(title).trim();
    if (message !== undefined) list[idx].message = String(message).trim();
    if (type !== undefined && ['info', 'warning', 'success'].includes(type)) list[idx].type = type;
    if (active !== undefined) list[idx].active = Boolean(active);
    writeJson(ANNOUNCEMENTS_PATH, list);
    return res.json({ success: true, announcement: list[idx] });
});

app.delete('/api/admin/announcements/:id', requireAuth, (req, res) => {
    const list = readJson(ANNOUNCEMENTS_PATH, []);
    const idx = list.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Announcement not found.' });
    list.splice(idx, 1);
    writeJson(ANNOUNCEMENTS_PATH, list);
    return res.json({ success: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[admin-server] Running on port ${PORT}`);
});
