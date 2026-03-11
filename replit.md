# Deriv Bot

## Overview

Deriv Bot is a web-based automated trading platform that allows users to create trading bots without coding. The application uses a visual block-based programming interface (powered by Blockly) to let users design trading strategies. Users can build bots from scratch, use quick strategies, or import existing bot configurations. The platform supports both demo and real trading accounts through the Deriv trading API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Framework
- **React 18** with TypeScript as the primary UI framework
- **MobX** for state management across the application
- Stores are organized in `src/stores/` with a root store pattern that aggregates domain-specific stores (client, dashboard, chart, run-panel, etc.)

### Build System
- **Rsbuild** as the primary build tool (modern, fast bundler)
- Webpack configuration available as fallback
- Babel for transpilation with support for decorators and class properties

### Visual Programming
- **Blockly** library for the drag-and-drop bot building interface
- Custom blocks and toolbox configurations for trading-specific operations
- Workspace serialization for saving/loading bot strategies

### Trading Integration
- **@deriv/deriv-api** for WebSocket-based communication with Deriv trading servers
- Real-time market data streaming and order execution
- Support for multiple account types (demo, real, wallet-based)

### Authentication
- **Custom Deriv OAuth flow** using App ID `125748` and redirect URI `https://dollarprinter.pro/auth/callback`
- Login button: `https://oauth.deriv.com/oauth2/authorize?app_id=125748&redirect_uri=https://dollarprinter.pro/auth/callback`
- Sign-up button redirects to affiliate link via `redirectToSignUp()` in `src/components/shared/utils/login/login.ts`
- Custom callback handler at `src/pages/auth-callback/auth-callback-page.tsx` reads `acct1`, `token1`, `cur1` params directly from URL (Deriv sends tokens directly, not via OIDC code flow)
- Auth tokens stored in localStorage: `authToken`, `active_loginid`, `accountsList`, `clientAccounts`
- Token Management Backend (TMB) integration for enhanced session handling
- Multi-account support with account switching capabilities

### Charting
- **@deriv/deriv-charts** for displaying market data and trade visualizations
- Real-time chart updates during bot execution

### PWA Support
- Service worker for offline capabilities
- Installable as a Progressive Web App on mobile devices
- Offline fallback page

### Internationalization
- **@deriv-com/translations** for multi-language support
- CDN-based translation loading with Crowdin integration

### Analytics & Monitoring
- **RudderStack** for event tracking and analytics
- **Datadog** for session replay and performance monitoring
- **TrackJS** for error tracking in production

## External Dependencies

### Deriv Ecosystem Packages
- `@deriv-com/auth-client` - Authentication client
- `@deriv-com/analytics` - Analytics integration
- `@deriv-com/quill-ui` / `@deriv-com/quill-ui-next` - UI component library
- `@deriv-com/translations` - Internationalization
- `@deriv/deriv-api` - Trading API client
- `@deriv/deriv-charts` - Charting library

### Cloud Services
- **Vercel** - Deployment platform (custom domain: dollarprinter.pro)
  - `vercel.json` has SPA rewrite rule: all routes → `/index.html` to prevent 404 on `/auth/callback`
- **Google Drive API** - Bot strategy storage and sync
- **LiveChat** - Customer support integration
- **Intercom** - In-app messaging (feature-flagged)
- **GrowthBook** - Feature flag management
- **Survicate** - User surveys

### Third-Party Libraries
- `blockly` - Visual programming blocks
- `mobx` / `mobx-react-lite` - State management
- `react-router-dom` - Client-side routing
- `formik` - Form handling
- `@tanstack/react-query` - Server state management
- `js-cookie` - Cookie management
- `localforage` - Client-side storage
- `lz-string` / `pako` - Compression utilities

## Deployment

- **Platform**: Vercel (connected to GitHub, auto-deploys on push)
- **Domain**: dollarprinter.pro
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Routing**: SPA rewrites in `vercel.json` — all paths serve `index.html`

## Deriv OAuth Configuration

- **App ID**: 125748
- **Login URL**: `https://oauth.deriv.com/oauth2/authorize?app_id=125748&redirect_uri=https%3A%2F%2Fdollarprinter.pro%2Fauth%2Fcallback`
- **Redirect URI**: `https://dollarprinter.pro/auth/callback`
- **Affiliate sign-up link**: `https://deriv.partners/rx?sidc=97FBD1C7-EC02-4446-A72B-926E27CF5B6A&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU306765`
- **Important**: Deriv sends tokens as `?acct1=&token1=&cur1=` query params (NOT OIDC authorization code). Never use `@deriv-com/auth-client`'s `Callback` component for this flow.

## Recent Changes

### Deriv OAuth Login Fix (March 2026)
- Created `vercel.json` with SPA rewrites (previously only `vercel.dr.json` existed, which Vercel did not recognise)
- Built custom `AuthCallbackPage` at `src/pages/auth-callback/auth-callback-page.tsx` that reads Deriv's `acct1`/`token1`/`cur1` params directly, stores them in localStorage, sets a `logged_state` cookie, then redirects to the dashboard
- Added `/auth/callback` route to React Router in `src/app/App.tsx`
- Rewrote `src/components/shared/utils/login/login.ts` with hardcoded constants for app_id 125748 and redirect URI
- Fixed login/signup buttons in header: changed `window.open()` to `window.location.href` to avoid popup blockers; added missing `redirectToSignUp` import

### Free Bots Feature (December 2025)
- Added Free Bots page with 12 pre-built trading bot templates
- Bot cards display with category filtering (Speed Trading, AI Trading, Pattern Analysis, etc.)
- Click-to-load functionality that imports bot XML into Bot Builder
- Responsive card design with hover effects and loading states
- Bot XML files stored in `/public/bots/` directory
- Files: `src/pages/free-bots/index.tsx`, `src/pages/free-bots/free-bots.scss`