# Dollar Printers — Launch Checklist

Everything you need to configure to take this refurbished platform live on
**https://www.dollarprinter.pro/**. Work top to bottom; items marked **🔴 required**
are blockers for going live, **🟡 recommended**, **🟢 optional**.

---

## 1. Deriv application (the money link) — 🔴 required

Your `app_id` ties all trading volume to your Deriv account (markup/commission). Use your
own — never ship someone else's.

- [ ] Register / confirm your app at **https://api.deriv.com/dashboard**.
- [ ] Set the OAuth **Redirect URL** to `https://www.dollarprinter.pro/auth/callback`
      (and `https://dollarprinter.pro/auth/callback`).
- [ ] Add the redirect/callback URLs you actually use: `/callback`, `/auth/callback`.
- [ ] Note your numeric `app_id`.
- [ ] Confirm it in `src/components/shared/utils/config/config.ts`:
    - `domainAppId` maps `dollarprinter.pro` → **125748**. Replace `125748` everywhere it
      appears if your registered app id is different.
    - Add an entry for any new domain you serve from (e.g. a `.pages.dev` preview).
- [ ] Set markup % on the Deriv app dashboard (this is how the platform earns).

> The new **Analysis Tool** and **Signals** scanners read public market data using this
> same `app_id`, so they need no extra setup once the id is correct.

---

## 2. Branding & assets — 🟡 recommended

- [ ] `public/logo.png` — your logo (currently present). Keep it square-ish; it renders at
      40px tall in the header.
- [ ] Favicon / apple-touch icons referenced in `index.html` (uses `/logo.png`).
- [ ] `public/manifest.json` — PWA `name`, `short_name`, `theme_color`.
- [ ] `index.html` — `<title>`, meta description, `og:`/Twitter tags, `theme-color`.
- [ ] `src/utils/site-config.ts` — `website_domain`, `website_name`, `default_title`.
- [ ] Hero banner copy/gradient in `src/pages/dashboard/hero-banner.tsx` +
      `.hero-banner` styles in `src/pages/dashboard/dashboard.scss` (tune to taste/brand).
- [ ] Accent colour `#ff444f` lives in `src/components/shared/styles/_constants.scss`
      (`$color-red`) — change if you rebrand.

---

## 3. Environment variables — 🔴/🟡

Set these in your host (Cloudflare Pages / Vercel / Replit Secrets).

| Variable                                          | Needed for                                      | Required             |
| ------------------------------------------------- | ----------------------------------------------- | -------------------- |
| `ADMIN_USER`                                      | Admin panel login                               | 🔴 if using `/admin` |
| `ADMIN_PASS`                                      | Admin panel login                               | 🔴 if using `/admin` |
| `JWT_SECRET`                                      | Signs admin sessions (set a long random string) | 🔴 if using `/admin` |
| `ADMIN_API_PORT`                                  | Admin Express port (default 3001)               | 🟢                   |
| `TRANSLATIONS_CDN_URL`                            | i18n strings CDN                                | 🟡                   |
| `R2_PROJECT_NAME`                                 | i18n CDN path                                   | 🟡                   |
| `CROWDIN_BRANCH_NAME`                             | i18n branch                                     | 🟡                   |
| `GD_APP_ID`                                       | Google Drive bot import/export                  | 🟢                   |
| `TRACKJS_TOKEN`                                   | JS error tracking                               | 🟢                   |
| `DATADOG_APPLICATION_ID` / `DATADOG_CLIENT_TOKEN` | RUM analytics                                   | 🟢                   |

- [ ] `JWT_SECRET` is a strong random value (e.g. `openssl rand -hex 32`).
- [ ] Admin credentials are **not** defaults and not committed.

---

## 4. Free bots library — 🟡 recommended

- [ ] `public/bots/manifest.json` lists each bot (id, name, category, file, icon).
- [ ] Each referenced `.xml` exists in `public/bots/`.
- [ ] Or manage them at runtime via **/admin** (upload/edit/delete) — needs the admin
      server running and admin env vars set.
- [ ] Verify each bot loads into the Bot Builder without errors.

---

## 5. Copy Trading — 🟡 recommended

The Copy Trading tab uses Deriv's official `copy_start` / `copy_stop` /
`copytrading_statistics`. To make it useful:

- [ ] Document for your users that a **trader** must enable _"Allow copiers"_ in their
      Deriv security settings and share their **read-only API token**.
- [ ] Provide one or more in-house trader tokens/IDs if you want featured traders.
- [ ] Confirm copying works end-to-end on a **demo** account first.

---

## 6. Deployment — 🔴 required

### Cloudflare Pages (primary)

- [ ] Build command: `npm run build` · Output dir: `dist`.
- [ ] GitHub Actions / project secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`,
      `CLOUDFLARE_PROJECT_NAME`.
- [ ] SPA fallback: all routes rewrite to `/index.html` (handled by `dist/_redirects`).
- [ ] Confirm `/signals`, `/copy-trading`, `/analysis-tool`, `/free-bots`, `/auth/callback`
      all resolve (no 404 on hard refresh).

### Vercel (alternative)

- [ ] `vercel.json` rewrites are in place; set the same build/output.

### Admin API (optional, separate service)

- [ ] Deploy `server/index.js` (Node) if you use `/admin`; expose port 3001 behind your
      proxy; set the admin env vars there.

---

## 7. Third-party widgets — 🟢 optional

- [ ] LiveChat license/client IDs in `index.html` (currently `12049137`) → replace with
      yours or remove.
- [ ] Survicate / analytics snippets in `src/public-path` and `index.html`.

---

## 8. Pre-launch QA — 🔴 required

Test on a **demo** account first, desktop + mobile:

- [ ] Login via Deriv OAuth completes and lands back in the app.
- [ ] **Dashboard** hero + cards render; quick-launch chips switch tabs.
- [ ] **Bot Builder** loads Blockly; a quick strategy runs and stops.
- [ ] **Free Bots** import into the workspace.
- [ ] **Charts** load and stream ticks.
- [ ] **Analysis Tool** shows a "Live" pill, the digit grid fills, percentages update each
      tick, and changing market/tick-count/barrier works.
- [ ] **Signals** lists all markets, ranks them, and updates live.
- [ ] **Copy Trading** shows the login CTA when logged out; when logged in, "View stats"
      and start/stop respond (use a real trader id/token to fully verify).
- [ ] Run panel: start/stop, stake & loss limits behave.
- [ ] Logout / account switch works; balance updates.
- [ ] Lighthouse/PWA install prompt works; offline indicator appears when offline.

---

## 9. Legal & compliance — 🔴 required

- [ ] Responsible-trading disclaimer visible (Analysis Tool, Signals and Copy Trading each
      already render one — keep them).
- [ ] Terms of Service, Privacy Policy, and Risk Disclosure pages/links.
- [ ] Make clear you are a **third-party** interface to Deriv, not Deriv itself, and not
      offering financial advice. Signals are statistical/educational only.
- [ ] Confirm your jurisdiction allows offering this and that you meet Deriv's
      partner/affiliate terms.

---

## 10. Domain & DNS — 🔴 required

- [ ] `dollarprinter.pro` (and `www`) point to your host.
- [ ] HTTPS/SSL active; HTTP→HTTPS redirect on.
- [ ] `www` ↔ apex behaviour is consistent with the OAuth redirect URLs you registered.

---

## Quick command reference

```bash
npm install            # deps (Node 20.x)
npm run dev            # local dev (Rsbuild)
npm run start:webpack  # local dev on Replit (Webpack)
npm run build          # production build → dist/
npm run test:lint      # Prettier + ESLint
npm test               # Jest

node server/index.js   # admin API (:3001)
```

When every 🔴 box is ticked and QA passes on demo, you're ready to go live. 🚀
