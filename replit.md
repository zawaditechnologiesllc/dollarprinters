# Dollar Printers | Deriv Bot V2

A web-based automated trading platform built for the Deriv ecosystem. Allows users to build, test, and run trading bots using a visual programming interface (Blockly) or pre-configured strategies.

## Architecture

- **Frontend**: React 18 + TypeScript, built with Webpack (dev) / Rsbuild (production)
- **Backend**: Express.js admin API server
- **State Management**: MobX
- **Styling**: SCSS with modular component styles
- **Bot Logic**: Google Blockly + JS-Interpreter
- **Trading API**: Deriv WebSocket API

## Project Structure

```
src/
  app/          # Core application, routing (React Router v6), entry points
  components/   # Reusable UI components (shared_ui, layout, etc.)
  external/     # External integrations (bot-skeleton trading engine)
  pages/        # Top-level views (bot-builder, dashboard, admin, etc.)
  stores/       # MobX state management (RootStore pattern)
  analytics/    # Analytics helpers
  constants/    # App constants
  hooks/        # Custom React hooks
  types/        # TypeScript type definitions
  utils/        # Utility functions
  styles/       # Global SCSS styles

server/
  index.js      # Express admin API server (port 3001)

public/
  bots/         # Pre-made bot strategy XML files + manifest.json
  announcements.json

webpack.config.js   # Webpack config (primary dev build tool on Replit)
rsbuild.config.ts   # Rsbuild config (for production builds / Cloudflare Pages)
```

## Workflows

- **Dev Server**: `npm run start` → runs webpack dev server on port 5000
- **Admin API Server**: `node server/index.js` → Express API on port 3001

## Key Notes

### Replit Compatibility
- **Rsbuild/Rspack** crashes with "Bus error" in this environment (native binary incompatibility).
- **Webpack** is used as the dev build tool on Replit instead.
- The `webpack.config.js` replicates all rsbuild settings: aliases, SCSS includePaths, proxy to admin API, HMR, etc.
- SCSS `includePaths: ['src']` enables `@use 'components/shared/styles/...'` imports project-wide.

### Path Aliases (webpack + rsbuild)
```
@/external  → src/external
@/components → src/components
@/hooks     → src/hooks
@/utils     → src/utils
@/constants → src/constants
@/stores    → src/stores
@/pages     → src/pages
@/analytics → src/analytics
@/types     → src/types
@/Types     → src/types
@/public-path → src/public-path
```

### Authentication
- Users authenticate via Deriv's OAuth flow (intercepted in App.tsx).
- The app redirects to Deriv auth on first load — blank screen is expected without valid Deriv session.
- Admins authenticate via `/admin-login` using `ADMIN_USER`/`ADMIN_PASS` env vars + JWT cookies.

### Environment Variables
Set these in Replit Secrets for full functionality:
- `ADMIN_USER` / `ADMIN_PASS` — Admin panel credentials
- `JWT_SECRET` — Admin session JWT secret (auto-generated if not set)
- `TRANSLATIONS_CDN_URL`, `R2_PROJECT_NAME`, `CROWDIN_BRANCH_NAME` — i18n
- `TRACKJS_TOKEN` — Error tracking
- `DATADOG_APPLICATION_ID`, `DATADOG_CLIENT_TOKEN`, etc. — Analytics

## Chart (SmartChart) Integration

- `@deriv/deriv-charts` lazy-loads JS chunks (e.g. `*.smartcharts.js`) from the `/js/smartcharts/` URL path.
- **Webpack devServer** now serves `node_modules/@deriv/deriv-charts/dist` at `/js/smartcharts` via the `static` array.
- **CopyPlugin** copies smartcharts files to `dist/js/smartcharts/` for production builds.
- `chart_api` (a singleton `ChartAPI` instance) creates its own WebSocket to Deriv; initialized via `api_base.ts` on connection.
- `chart.tsx` implements `requestAPI`, `requestForget`, `requestForgetStream`, `requestSubscribe` inline using `chart_api.api`.
- The `SmartChart` component only renders when `symbol` is resolved (loaded from localStorage or first active symbol).

## Bot Builder (Blockly) Integration

- `DBot.initWorkspace('/', ...)` injects Blockly into `#scratch_div` element.
- Blockly media files served from `/assets/media/` (→ `public/assets/media/`).
- `setDBotEngineStores()` must be called before `app.onMount()` — this happens in `app-content.jsx`'s `init()` which runs as soon as `is_api_initialized` is true.
- `workspace-wrapper.tsx` renders the workspace UI only when `!is_loading && window.Blockly?.derivWorkspace`.

## GitHub Remote

Remote `origin` is configured to `https://github.com/zawaditechnologiesllc/dollarprinters`. Pushing requires a GitHub personal access token (PAT) — set as `GITHUB_TOKEN` in Replit Secrets, then configure git credentials.

## Node Version
Node 22 (upgraded from 20 for Replit compatibility).
