# Seller Studio

A private, local-first app for one Etsy seller. It answers four questions:

1. **What should I fix?** Listing SEO suggestions, ranked by how much proven sales they touch.
2. **What should I make?** Keyword and product gaps from your sales, Krafie research and Etsy Marketplace Insights.
3. **Can the app prepare it?** Brief → design → mockups → listing copy → files, in one stepper.
4. **What's ready to publish?** A drafts queue. Etsy drafts stay private until you type `PUBLISH`.

It runs on your computer at `http://127.0.0.1:3000`. It's shop-agnostic: each seller uses their own Etsy app and their own Krafie login.

> The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.

---

## Try it in two minutes (no Etsy account needed)

Requires **Node.js 22.5 or newer** (it uses Node's built-in SQLite, so there's nothing to `npm install`).

```bash
npm run demo
```

Then open http://127.0.0.1:3000. This builds a **fictional** demo shop and runs the real sync, research, audit and draft code against an offline stand-in for Etsy. Nothing is sent to Etsy or Krafie.

---

## Connect your own shop

### 1. Create an Etsy app

1. Sign in to the Etsy account that owns the shop and open https://www.etsy.com/developers/your-apps.
2. Create an app and describe the use truthfully: a private tool for your own shop.
   - **Personal access** covers your own shop (and a small number of shops you're approved for).
   - A tool offered to other sellers needs **commercial access** from Etsy. A personal key does not authorise a public service. See [Hosting for other sellers](#hosting-for-other-sellers).
3. Register this exact callback URL: `https://localhost:3003/oauth/callback`
4. Wait for the app to be approved and active.

### 2. Configure

```bash
cp .env.example .env
```

Put your **keystring** and **shared secret** into `.env` yourself. Never paste them into a chat. If either has ever been shared, rotate it on Etsy first. `.env` is gitignored.

### 3. Check the key, make a local certificate, authorise

```bash
npm run ping
```

```bash
npm run cert
```

```bash
npm run auth
```

`npm run auth` prints an Etsy link. Approve it, and the browser comes back to `https://localhost:3003/oauth/callback`. Your browser will warn about the self-signed certificate; that's expected for localhost.

The token is encrypted with your operating system's secure store: **Windows DPAPI**, **macOS Keychain**, or **libsecret** on Linux (`sudo apt install libsecret-tools`). If none is available the app refuses to save it rather than writing a plain file.

Scopes requested: `listings_r shops_r transactions_r`, plus `listings_w` only when `ETSY_ENABLE_WRITES=1`. No delete, address, email, profile, shop-write or transaction-write scopes. Changing scopes means running `npm run auth` again.

### 4. Sync and open

```bash
npm run sync
```

```bash
npm run dashboard
```

On Windows you can double-click `scripts\launch.cmd`; on macOS/Linux run `scripts/launch.sh`.

---

## Krafie research and creative tools

```bash
npm install -g @krafie/mcp
```

```bash
krafie-mcp login
```

The Krafie CLI keeps its own token; this project never copies it. The app starts `krafie-mcp` from the server (never the browser), lists its tools, and matches them by role, so renamed tools keep working.

```bash
npm run research:sync
```

Optionally name seeds: `npm run research:sync -- "wedding signs" "teacher gifts"`, or set `RESEARCH_SEEDS` in `.env`. Without seeds, the app uses the lead phrases of your best sellers.

- Every Krafie number is labelled a **third-party estimate**. It is never shown as official Etsy search volume.
- **Image, mockup and video generation** always shows the cost estimate first and needs your confirmation. Each job is submitted once. A job whose submission outcome is unknown is marked "check Krafie" and never resubmitted automatically. Video jobs survive page reloads.
- **Media history** shows Krafie media generated *through this app*. Krafie's MCP server doesn't expose your whole account history.
- **Mockups:** Krafie's MCP server has no mockup tool yet. If it gains one, the app uses it automatically. Otherwise set `KREATORIUM_MOCKUP_URL` to a narrow authenticated endpoint and store its token in the vault:
  ```bash
  node scripts/set-secret.js kreatorium < token.txt
  ```
  The template ids in `src/lib/creative.js` are placeholders; map them to your real Kreatorium templates.

## Etsy Marketplace Insights (official, optional)

Insights lives in Shop Manager → Stats and isn't in the public API. Import it by:

- **Research → Import Insights** and pasting CSV, or
- dropping `.csv` files into `data/imports/marketplace-insights/` (they're picked up on the next research refresh or dashboard start).

Header: `keyword,searches_30d,listings_30d,trend,captured_at`. Imported values are labelled **Official Etsy Marketplace Insights**. Missing values stay "Not available"; they're never filled from estimates. The app does not automate searches in your signed-in Etsy page.

---

## Turning on the draft lister

1. Set `ETSY_ENABLE_WRITES=1` in `.env`.
2. Run `npm run auth` again to add `listings_w`.
3. **Create** → finish the six steps → **Create Etsy draft**. This makes a **private** Etsy draft, uploads images, video and files, sets the SKU, then reads the draft back and compares it.
4. **Drafts** → **Publish to Etsy…** → tick the fee acknowledgement and type `PUBLISH`.

Guardrails:

- Draft first, publish second. Generation and scheduled refreshes can never publish or edit a listing; the scheduler doesn't import the write code.
- If a later step fails, the Etsy draft id and the failed step are shown, and **Retry / resume** continues from there. Finished uploads are skipped, and a create whose outcome is unknown is looked up on Etsy before creating again.
- Editing an existing listing (Optimize → Stage → Apply) saves a backup first and checks the field hasn't changed on Etsy since the audit. It patches only the fields you approved, then reads them back. "Proven" listings (top 10% of revenue) need an extra tick.
- Every Etsy write goes into the audit log with before/after values. The Performance page compares the same-length windows before and after each change. That's correlation, not causation.
- Brand, character and celebrity terms block a draft until you confirm you have the rights.

**Before trusting it with your shop:** create one test digital draft and confirm it on Etsy. Publish it only if you want it live.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run demo` | Build the fictional demo shop and start the dashboard |
| `npm run cert` | Self-signed certificate for the local OAuth callback |
| `npm run ping` | Check the API key without OAuth |
| `npm run auth` | Connect your Etsy shop (PKCE) |
| `npm run sync` | Pull listings, orders and profiles from Etsy |
| `npm run research:sync` | Pull Krafie research; import dropped Insights CSVs |
| `npm run dashboard` | Start the dashboard on 127.0.0.1 |
| `npm run check` | Syntax check + secret scan |
| `npm test` | Automated tests (offline) |

### Refresh schedule

Use the **Refresh** buttons, or set `SCHEDULE_ETSY_HOURS=6` and `SCHEDULE_RESEARCH_HOURS=24`. Those timers only run while the dashboard is running. For unattended refresh, schedule `npm run sync` and `npm run research:sync` with Windows Task Scheduler, launchd or cron. The Krafie CLI login has to stay valid, but no coding tool needs to be open. Overlapping runs are refused, and a failed run keeps the last good data.

---

## Where things live

```
dashboard/            index.html, app.js, styles.css, methodology.html  (served from an allow-list only)
src/dashboard-server.js, auth-server.js, sync.js, research-sync.js, ping.js, scheduler.js
src/lib/etsy.js       every Etsy endpoint, encoding, retry and rate-limit rule (one place to update)
src/lib/etsy-sync.js  sync → SQLite in one transaction + sanitised dated snapshot
src/lib/seo.js        listing audit, recommendations, priority
src/lib/research.js   research sync, Insights import, opportunity model
src/lib/krafie.js     Krafie MCP adapter (+ offline demo provider)
src/lib/drafts.js     listing generator, validation, resumable Etsy draft pipeline, publish
src/lib/listing-writes.js  approved field changes to existing listings + outcomes
src/lib/creative.js   estimate → confirm → poll creative jobs; Kreatorium adapter
src/lib/vault.js      DPAPI / Keychain / libsecret token storage
data/app/studio.db    SQLite: listings, sanitised receipts, recommendations, drafts, jobs, audit log
data/raw/             dated sanitised Etsy snapshots      data/research/  dated research snapshots
data/assets/          your uploads and generated media (random names, outside the web root)
```

Everything under `data/`, `certs/` and `.env` is gitignored.

## Privacy and security checklist (before sharing or demoing)

- [ ] `.env`, `certs/` and `data/` are not in the repo or in any zip you share (`npm run check` scans for secrets).
- [ ] Demo with `npm run demo` in a separate folder (`STUDIO_DATA_DIR=./data-demo npm run demo`), not your real shop.
- [ ] Screenshots show no keystring, token, or order details.
- [ ] Receipts are stored as an allow-list: no buyer names, emails, ids, addresses, messages or personalisation text.
- [ ] The dashboard binds to 127.0.0.1, rejects foreign Host headers, and requires a per-session token plus same-origin for every write.

**Disconnect:**

```bash
node scripts/disconnect.js
```

This removes the tokens. Add `--delete-data` to also delete local data. Revoke the app on Etsy too, under Account settings → Apps. **Export:** the `data/` folder is your export (SQLite plus JSON snapshots). **Back up:** copy `data/` while the app is stopped.

## Hosting for other sellers

Not supported as-is. A hosted, multi-seller version needs, at minimum: Etsy **commercial access**, real user authentication, per-seller tenant isolation on every query, encrypted server-side credential storage with key rotation, CSRF/secure cookies, backups, and data export and deletion. It also needs the Etsy disclosure shown prominently.

## Limits and things to verify

- The Etsy docs weren't reachable while this was built, so endpoint details come from the Open API v3 as previously documented. They live in `src/lib/etsy.js` and `ETSY_LIMITS` in `src/lib/config.js`. Check them against the Etsy Dev MCP (`https://mcp.api.etsycloud.com/mcp`) before the first real write, especially:
  - the `x-api-key` format,
  - array encoding in form posts,
  - processing-profile (`readiness_state_id`) fields,
  - personalisation fields,
  - image and alt-text limits.
  The read-back step flags any field Etsy stores differently.
- Conversion rate and visits aren't in the Open API, so they show as unavailable.
- Variations and multi-question personalisation aren't built yet; single-product inventory (SKU, price, quantity) is.
- Listing copy is generated from templates, not an AI model: one recommended version plus alternatives, for you to edit.
