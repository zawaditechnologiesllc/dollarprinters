'use strict';

const path = require('path');
const fs = require('fs');
const { verifySession } = require('./_helpers');

const MANIFEST_PATH = path.join(process.cwd(), 'public/bots/manifest.json');
const TMP_ANALYTICS = '/tmp/dp-analytics.json';
const ANALYTICS_PATH = path.join(process.cwd(), 'server/analytics.json');

function readManifest() {
    try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch {}
    return [];
}

function readAnalytics() {
    if (fs.existsSync(TMP_ANALYTICS)) {
        try { return JSON.parse(fs.readFileSync(TMP_ANALYTICS, 'utf8')); } catch {}
    }
    if (fs.existsSync(ANALYTICS_PATH)) {
        try { return JSON.parse(fs.readFileSync(ANALYTICS_PATH, 'utf8')); } catch {}
    }
    return { pageViews: {}, dailyVisitors: {}, botLoads: {} };
}

module.exports = function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed.' });
    }

    const payload = verifySession(req);
    if (!payload) return res.status(401).json({ success: false, error: 'Unauthenticated.' });

    const analytics = readAnalytics();
    const manifest = readManifest();
    const today = new Date().toISOString().slice(0, 10);

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

    return res.status(200).json({
        success: true,
        totalPageViews: totalViews,
        todayViews: todayTotal,
        last7Days,
        topBots: botLoadsWithNames,
        pageBreakdown: analytics.pageViews,
    });
};
