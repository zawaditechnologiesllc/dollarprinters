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

## Node Version
Node 22 (upgraded from 20 for Replit compatibility).
