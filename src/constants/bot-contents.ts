type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    FREE_BOTS: 2,
    CHART: 3,
    DCIRCLES: 4,
    ANALYSIS_TOOL: 5,
    SIGNALS: 6,
    COPY_TRADING: 7,
    TUTORIAL: 8,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-free-bots',
    'id-charts',
    'id-dcircles',
    'id-analysis-tool',
    'id-signals',
    'id-copy-trading',
    'id-tutorials',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
