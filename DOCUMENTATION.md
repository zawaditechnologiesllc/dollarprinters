# Dollar Printers — Platform Documentation

Dollar Printers (live at **https://www.dollarprinter.pro/**) is a web-based automated
trading platform for the Deriv ecosystem. It lets users build, test and run trading
bots with a visual editor, run pre-made free bots, read live market analysis, follow
trade signals, and copy expert traders — all backed by the official Deriv WebSocket API.

This document explains the architecture, every feature, configuration, and how to run,
build and deploy the platform. For the go-live checklist, see **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)**.

---

## 1. Tech stack

| Layer         | Technology                                                  |
| ------------- | ----------------------------------------------------------- |
| Frontend      | React 18 + TypeScript                                       |
| State         | MobX (`RootStore` pattern) + React Query                    |
| Bot engine    | Google Blockly 10 + `@deriv/js-interpreter`                 |
| Charts        | `@deriv/deriv-charts` (SmartChart) + TradingView            |
| Trading API   | Deriv WebSocket API (`@deriv/deriv-api`)                    |
| Auth          | Deriv OAuth / OIDC (`@deriv-com/auth-client`)               |
| Build         | Rsbuild/Rspack (production) · Webpack (Replit dev)          |
| Styling       | SCSS (modular, light/dark themes via `@deriv-com/quill-ui`) |
| Admin backend | Express.js (port 3001) + JWT                                |

---

## 2. Project structure

```
src/
  app/            App.tsx — routing (React Router v6), OAuth callback interception
  components/     Reusable UI (layout/header, shared_ui, run-panel, chart, journal …)
  constants/      bot-contents.ts (tab indices), quick-strategies, etc.
  external/       bot-skeleton — the trading engine + Deriv API service layer
  hooks/          useStore, useApiBase, useTMB …
  pages/          Top-level views (one folder per tab/route)
    dashboard/        Landing dashboard + hero banner
    bot-builder/      Blockly workspace + quick strategies
    free-bots/        Pre-made downloadable bots (manifest-driven)
    chart/            SmartChart wrapper
    dcircles/         Deriv social-trading link page
    analysis-tool/    NATIVE live digit/over-under/even-odd analysis
    signals/          NATIVE multi-market signal scanner
    copy-trading/     NATIVE copy-trading (Deriv copy_start/copy_stop API)
    tutorials/        Guided tours + FAQ
    admin/            Admin dashboard (bot & announcement management)
  stores/         MobX stores
  styles/         Global SCSS
server/
  index.js        Express admin API (bots, announcements, analytics, auth)
public/
  bots/           Pre-made bot XML files + manifest.json
  assets/         Blockly media, PWA icons
```

### Path aliases

`@/components`, `@/hooks`, `@/utils`, `@/constants`, `@/stores`, `@/pages`,
`@/external`, `@/analytics`, `@/types` → corresponding `src/*` folders.

---

## 3. Features

### 3.1 Dashboard

The first tab. Now opens with a **branded hero banner** (`src/pages/dashboard/hero-banner.tsx`)
with quick-launch chips into every tool, plus the existing bot cards, announcements,
and info panel.

### 3.2 Bot Builder (Blockly)

No-code visual editor (`src/pages/bot-builder/`). Drag-and-drop blocks compile to a
strategy run by the trade engine in `src/external/bot-skeleton/`. Includes **Quick
Strategies**: Martingale, Reverse Martingale, D'Alembert, Reverse D'Alembert, Oscar's
Grind and 1-3-2-6.

### 3.3 Free Bots

`src/pages/free-bots/` renders a library from `public/bots/manifest.json`. Each entry
points to an `.xml` strategy in `public/bots/`. One click imports a bot into the Bot
Builder workspace. Managed from the Admin panel (upload / edit / delete).

### 3.4 Charts

`src/pages/chart/` — SmartChart with indicators and drawing tools, plus a TradingView
modal. Chart data uses a dedicated `chart_api` WebSocket.

### 3.5 Analysis Tool (native — rebuilt)

`src/pages/analysis-tool/` was previously an embedded third-party iframe. It is now a
**fully native, real-time analysis dashboard** powered directly by the Deriv WebSocket:

- **Market selector** — all 10 Volatility indices (R_10…R_100 and the 1-second variants).
- **Tick count** — 25 / 50 / 100 / 250 / 500 / 1000.
- **Last-digit distribution** — 0-9 cells with live percentages, hottest digit (green) and
  coldest digit (red) highlighted, plus the current digit ringed.
- **Even / Odd**, **Over / Under** (with selectable barrier 1-9), **Rise / Fall** percentage bars.
- **Live price + current last digit** with a Live/Reconnecting status pill.
- **Live Signal** panel that surfaces any statistically strong edge (≥55–58%).

Engine: `src/pages/analysis-tool/useTickAnalysis.ts` opens its own public WebSocket
(`ticks_history` with `subscribe: 1`), so it works **with or without** a logged-in account.
Decimal precision comes from the `pip_size` returned by Deriv.

### 3.6 Signals (native — new)

`src/pages/signals/` is a **multi-market scanner**. A single WebSocket subscribes to live
ticks for every Volatility index at once (`useMarketScanner.ts`), computes Even/Odd,
Rise/Fall and hot-digit stats per market, and ranks them by the strongest edge so the
best opportunity is always at the top. Renders update at most ~2.5×/second (throttled).

### 3.7 Copy Trading (native — new)

`src/pages/copy-trading/` integrates Deriv's official copy-trading API:

- **Review a trader** — `copytrading_statistics` by trader account ID (loginid): total
  trades, % profitable, average profit/loss, copiers, performance score.
- **Start copying** — `copy_start` with the trader's **read token**; their future trades
  are mirrored to the logged-in account.
- **Stop copying** — `copy_stop`. Active copy relationships are listed and persisted.

Requires login (uses the authorized `api_base` connection). Shows a login CTA otherwise.

### 3.8 D-Circles

`src/pages/dcircles/` — entry point to Deriv's social/copy community.

### 3.9 Tutorials

Guided onboarding tours (`react-joyride`), the bot-builder tour, and an FAQ.

### 3.10 Admin panel

`/admin-login` → `/admin`. JWT-protected (httpOnly cookie). Backed by `server/index.js`:
manage the free-bot library (upload/edit/delete XML), post announcements, and view
page-view / bot-load analytics.

---

## 4. Authentication & accounts

- Users sign in through **Deriv OAuth / OIDC**. The flow is intercepted in
  `src/app/App.tsx` (`interceptOAuthCallback`) so the token landing at the root URL is
  captured before React mounts; `/auth/callback` finalises the session.
- Tokens/accounts are kept in `localStorage` (`authToken`, `active_loginid`,
  `accountsList`, `clientAccounts`) and surfaced through the `client` MobX store and the
  `useApiBase()` hook (`isAuthorized`, `activeLoginid`, `accountList`).
- The trade engine authorises and subscribes in
  `src/external/bot-skeleton/services/api/api-base.ts`.

---

## 5. Deriv API configuration

App IDs and endpoints live in `src/components/shared/utils/config/config.ts`.

| Domain                                 | Deriv `app_id` |
| -------------------------------------- | -------------- |
| `dollarprinter.pro` / `bot.replit.app` | **125748**     |
| `localhost`                            | 36300          |
| `dbot.deriv.com` (reference)           | 65555          |

WebSocket servers: `green.derivws.com` (real), `blue.derivws.com` (demo),
`ws.derivws.com` (default/staging). OAuth base: `https://oauth.deriv.com/oauth2/authorize`
(auto-switches to `.me`/`.be` by region).

> **Important:** the `app_id` is what ties trading volume to your Deriv account. If you
> fork or re-domain this platform, register your own app at
> https://api.deriv.com/dashboard and update `config.ts`. See the launch checklist.

The native Analysis Tool / Signals reuse `getAppId()` + `getSocketURL()` to build their
public market-data sockets, so they automatically follow the same `app_id` mapping.

---

## 6. Running locally

```bash
npm install            # Node 20.x (or 22 on Replit)

npm run dev            # Rsbuild dev server  (default)
# or
npm run start:webpack  # Webpack dev server (use on Replit — Rsbuild can "Bus error" there)

node server/index.js   # Admin API on :3001 (optional, for /admin)
```

Open the printed local URL. A blank screen before login is expected — the app waits for a
Deriv session.

## 7. Building

```bash
npm run build          # Rsbuild production build → dist/
npm run build:webpack  # Webpack production build
npm run serve          # Serve the built dist/ locally
```

## 8. Quality

```bash
npm run test:lint      # Prettier + ESLint
npm test               # Jest unit tests
```

---

## 9. Deployment

The repo ships configs for multiple targets:

- **Cloudflare Pages** — primary. Build `npm run build`, output `dist/`. Needs
  `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_PROJECT_NAME` (GitHub Actions).
- **Vercel** — `vercel.json` / `vercel.dr.json` present.
- **Replit** — `.replit`; use the Webpack scripts there.

SPA routing: all unknown paths must rewrite to `index.html` (the platform config files
already do this). The Express admin server is a separate process and is optional for the
public site.

---

## 10. Environment variables

See **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)** for the full table. Key ones:
`ADMIN_USER`, `ADMIN_PASS`, `JWT_SECRET` (admin), `TRANSLATIONS_CDN_URL`,
`R2_PROJECT_NAME`, `CROWDIN_BRANCH_NAME` (i18n), `TRACKJS_TOKEN`, `DATADOG_*` (monitoring).

---

## 11. Branding

- Name: **Dollar Printers** · domain **dollarprinter.pro** · theme accent `#ff444f`.
- Logo: `public/logo.png`, rendered by `src/components/layout/app-logo.tsx`.
- Titles/PWA: `index.html`, `public/manifest.json`, `src/utils/site-config.ts`.

---

## 12. Responsible trading & disclaimer

Dollar Printers is a third-party interface to Deriv. Trading synthetic indices and
options carries significant risk. The Analysis Tool and Signals present **statistical
observations of recent ticks for educational purposes only** — they are **not** financial
advice and do not predict future outcomes. Copy Trading executes **real trades
automatically**. Always test on a demo account first and never trade more than you can
afford to lose.
