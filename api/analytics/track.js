'use strict';

const path = require('path');
const fs = require('fs');

const ANALYTICS_PATH = path.join(process.cwd(), 'server/analytics.json');
const TMP_ANALYTICS = '/tmp/dp-analytics.json';

function readAnalytics() {
    if (fs.existsSync(TMP_ANALYTICS)) {
        try { return JSON.parse(fs.readFileSync(TMP_ANALYTICS, 'utf8')); } catch {}
    }
    if (fs.existsSync(ANALYTICS_PATH)) {
        try { return JSON.parse(fs.readFileSync(ANALYTICS_PATH, 'utf8')); } catch {}
    }
    return { pageViews: {}, dailyVisitors: {}, botLoads: {} };
}

function writeAnalytics(data) {
    const json = JSON.stringify(data, null, 2);
    try { fs.writeFileSync(TMP_ANALYTICS, json, 'utf8'); } catch {}
    if (!process.env.VERCEL) {
        try { fs.writeFileSync(ANALYTICS_PATH, json, 'utf8'); } catch {}
    }
}

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

module.exports = function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed.' });
    }

    try {
        const { page, botId } = req.body || {};
        const analytics = readAnalytics();
        const today = todayKey();

        if (page) {
            analytics.pageViews[page] = (analytics.pageViews[page] || 0) + 1;
            if (!analytics.dailyVisitors[today]) analytics.dailyVisitors[today] = {};
            analytics.dailyVisitors[today][page] = (analytics.dailyVisitors[today][page] || 0) + 1;
        }

        if (botId) {
            analytics.botLoads[botId] = (analytics.botLoads[botId] || 0) + 1;
        }

        writeAnalytics(analytics);
    } catch {}

    return res.status(200).json({ success: true });
};
