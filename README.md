# Chaq Gym Attendance

Gamified fingerprint attendance system for Chaq Gym (thesis project).

```
development/
  web/      Next.js 16 + TypeScript + Tailwind web app (admin UI, API, Neon PostgreSQL)
  bridge/   C# (.NET 8) Fingerprint Bridge for the ZKTeco Live20R scanner (runs on the gym PC)
```

**How the pieces talk**

```
 Browser (admin / kiosk)  ──HTTP──►  Web app + API  ──►  Neon PostgreSQL
        │                                  ▲
        │ http://localhost:5055            │ GET /api/bridge/templates  (x-bridge-api-key header)
        ▼                                  │
   Fingerprint Bridge  ───────────────────┘      Live20R scanner (USB)
   (matches fingerprints locally, in memory)
```

* The **browser** asks the bridge to enroll/identify a finger, then tells the web API what happened.
* The **bridge** downloads all templates from the web app (on start and every 3 minutes) and matches locally.
  It never touches the database. Only fingerprint *templates* are stored, never images.
* The **web app** applies all rules (membership status, duplicate check-in, streaks, badges).

## Prerequisites

| Tool | Version | Used for |
|---|---|---|
| Node.js | LTS (22.9+; tested on 24) | web app |
| .NET SDK | 8.0 or newer (x64) | building the bridge |
| ZKTeco ZKFinger driver | SDK `setup.exe` (installs the x64 DLLs in `C:\Windows\System32`) | the scanner, on the gym PC |
| Neon account | project already linked in `web/neon.ts` / `web/.neon` | database |

## Environment variables (web)

Put them in `web/.env.local` (never commit it; `.env*` is git-ignored). `web/.env.example` lists them without values.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon **pooled** URL, used by the app |
| `DATABASE_URL_UNPOOLED` | Neon **direct** URL, used by migrations and seed scripts |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | credentials created by `npm run seed:admin` |
| `BRIDGE_API_KEY` | secret shared with the bridge (long random string) |
| `SESSION_SECRET` | signs the login cookie (32+ random bytes, hex) |
| `MEMBERSHIP_PRICE` | fixed monthly fee in pesos, default `800` (registration and renewal always charge this; the server enforces it) |
| `APP_TIMEZONE` | defaults to `Asia/Manila` |
| `NEXT_PUBLIC_BRIDGE_URL` | where the *browser* finds the bridge, default `http://localhost:5055` |
| `PORT` | read automatically by `next start` (Railway sets it) |

`NEON_*` variables are added by `neon deploy`; the app does not use them.

## Run locally

### 1. Web app

```powershell
cd web
npm install
neon login                 # once, in a browser (or: npx neon@latest login)
neon deploy                # writes DATABASE_URL etc. into .env.local
npm run migrate            # creates the tables (uses the direct URL)
npm run seed:admin         # creates the admin from ADMIN_USERNAME / ADMIN_PASSWORD (safe to re-run)
npm run dev                # http://localhost:3000   (or: npm run build && npm start)
```

* `npm run reset:admin` resets the admin password to the current `ADMIN_PASSWORD`.
* Sign in at http://localhost:3000/login. The role decides what opens: admin → `/admin`, member → `/member` ("coming soon").

### 2. Fingerprint Bridge (gym PC)

```powershell
cd bridge
# bridge/appsettings.local.json (git-ignored) must contain:  { "Bridge": { "ApiKey": "<same as BRIDGE_API_KEY>" } }
dotnet run -c Release
```

* A small status window opens (scanner connected, templates loaded, last scan, log). The API listens on `http://localhost:5055`.
* **Closing the window does not stop the bridge**: it hides to the tray icon (near the clock). Right-click the icon → *Exit bridge* to stop it on purpose.
* **Watchdog:** `ChaqBridge.exe` starts an invisible supervisor that runs the real bridge and restarts it within a few seconds if it ever crashes
  (the ZKTeco driver is native code, so a driver crash would otherwise take the whole program down). Crashes are written to `bridge.log` next to the exe.
* **Start with Windows:** on the gym PC run `powershell -ExecutionPolicy Bypass -File .\install-startup.ps1` once, from the folder that holds `ChaqBridge.exe`.
* Settings (`appsettings.json`, overridden by `appsettings.local.json` and env vars): `WebAppUrl`, `AllowedOrigins`, `SyncMinutes`, `Port`, `ApiKey`.
  Env var forms: `Bridge__WebAppUrl`, `ALLOWED_ORIGINS` (comma separated), `BRIDGE_API_KEY`.
* To make a standalone copy for the gym PC: `dotnet publish -c Release -o publish`, copy `publish/` to the PC and put a shortcut to
  `ChaqBridge.exe` in `shell:startup` so it starts at login. The target PC needs the .NET 8 **Desktop + ASP.NET Core runtime** and the ZKTeco driver.
* **Why the DLLs are not next to the exe:** copies of `libzkfp.dll` & friends in the app folder fail to initialise (error -2) while the
  driver-installed ones in `System32` work, so the bridge uses those. `bridge/native/` keeps a reference copy (git-ignored).

Bridge API: `GET /status`, `GET /enroll/progress`, `POST /enroll`, `POST /identify`, `POST /sync`, `POST /cancel`.
CORS only allows the origins in `AllowedOrigins`; other origins get 403.

### Using it

1. **Register** (admin) → monthly member (full name, consent, 3-scan enrollment, optional backup finger; the fee is a fixed ₱800) or walk-in (amount entered).
   Username = lastname + `2026` (`cruz2026`, then `cruz2026a`…), default password = lastname + `Chaq`; the member must change it at first login.
2. **Kiosk** (`/kiosk`) → fullscreen check-in screen; leave it open on the front-desk PC next to the bridge.
3. **Members / Attendance / Reports / Leaderboard / Dashboard** in the admin menu.
4. **Member app** (`/member`, built phone-first): members sign in with their own account (default password changed on first login) and see
   - **Home:** a big streak number whose card gets hotter with the streak, this week's tiles, a **monthly goal ring** (12 visits a month,
     `web/src/lib/goals.ts`), the next badge goal, their numbers, rank title (Rookie, Regular, Grinder, Beast, Legend by total visits) and
     membership days left. A full-screen **"New badge unlocked!"** celebration appears once per new badge;
   - **Board:** this month's top 10 by best streak (names shown as "Juan C."), their own rank and how far behind the person above;
   - **Me:** **"Your month" recap** (visits vs last month, best streak, hours trained, usual time of day), the badge collection (earned or
     locked with a hint), recent visits, a switch to hide from the leaderboard, theme, change password.
   - **10 badges** (`web/src/lib/badges.ts`): First Visit, 7-Day Fire, 30-Day Fire, 30 Visits, 100 Visits, Perfect Week, Weekend Warrior,
     Early Bird (before 7 AM), Night Owl (9 PM or later) and Comeback. They are awarded automatically at check-in.
   Everything is read from their own session (a member can never see another member's data), and the admin pages are closed to members.
   It is ready to become an installable app (PWA) later: single column, tab bar, safe-area padding.
5. **Theme:** Light / Dark / System switch at the bottom of the admin sidebar (also on the login page and the kiosk). It defaults to light and the choice is remembered per browser.

## Design

The look follows the "Athletic Modernist Operational" design system (the `stitch_modern_gym_admin_dashboard` folder): a cool slate canvas
with white cards and hairline borders, electric indigo for actions and streaks, emerald for "ready", orange for "expiring soon", Barlow
Condensed for headlines and big numbers, and Plus Jakarta Sans for text. The tokens live in one place, `web/src/app/globals.css`.
Only real data is shown: the design mock-ups' decorative numbers (momentum index, hardware latency, facility audit, security badges)
were left out on purpose.

**Your own logo:** save the gym's logo as `web/public/logo.png` (a square image works best). The sidebar, sign-in and member screens
pick it up automatically; until then a simple "CG" monogram is shown. To change the brand colour, edit `--primary`, `--brand` and
`--brand-strong` in `web/src/app/globals.css`.

The dashboard ("Today") is deliberately plain: one big number (who has checked in), a live list of who is in the gym, renewals due,
the scanner, and busy hours. The three member counts link to the members list already filtered.

## Code map (for the thesis defense)

| Layer | Folder | Job |
|---|---|---|
| UI | `web/src/app`, `web/src/components` | pages and components |
| API routes | `web/src/app/api` | HTTP in/out, `requireRole("admin")` on every admin route |
| Services | `web/src/services` | business rules (registration, membership, check-in, streaks, reports) |
| Pure rules | `web/src/lib` (`streak-rules`, `badges`, `accounts`, `time`) | no DB, no React; reused by Phase 2 |
| Data access | `web/src/data` | all SQL |
| Migrations | `web/db/migrations` | schema, applied by `npm run migrate` |
| Bridge | `bridge/*.cs` | `ScannerService` (SDK calls), `SyncService`, `Api`, `StatusForm` |

Security notes: bcrypt password hashes, signed httpOnly `SameSite=Lax` session cookie (8 h), login rate limit, role check on every admin API,
origin check on state-changing requests, bridge key compared in constant time, RA 10173 consent before enrollment, templates only.

## Deploy to Railway (to do later)

1. Push the repo to GitHub (the `web` folder is the service root; set **Root Directory** to `web`).
2. In Railway create a project → **Deploy from GitHub repo**. In the service **Settings**: Build command `npm run build`,
   Start command `npm run start`, **Pre-deploy command** `npm run migrate` (runs the migrations on every deploy).
3. Under **Variables** set: `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (from `neon connection-string`), `ADMIN_USERNAME`, `ADMIN_PASSWORD`,
   `BRIDGE_API_KEY`, `SESSION_SECRET`, `APP_TIMEZONE=Asia/Manila`, `MEMBERSHIP_PRICE=800`. `PORT` is provided by Railway.
   **Change `ADMIN_PASSWORD` to a strong one first** (the dev value is only for localhost).
4. Generate a public domain, deploy, then run the admin seed once: `railway run npm run seed:admin` (or temporarily set it as the pre-deploy command).
5. On the gym PC set `WebAppUrl` and `AllowedOrigins` in `bridge/appsettings.local.json` to the Railway URL
   (`https://<your-app>.up.railway.app`) and keep the same `BRIDGE_API_KEY`.
6. Use Chrome/Edge on the gym PC: the first time the Railway site calls `http://localhost:5055` the browser asks to allow
   "local network access"; choose **Allow**. (Safari blocks https→http localhost.)
7. Consider a separate Neon branch for development and `production` for Railway.

## If the scanner is unplugged (by accident or on purpose)

| Where | What you see |
|---|---|
| Kiosk | a big red **"Scanner not connected"** screen telling the person at the desk to plug the USB cable back in |
| Every admin page | a red dot **"Scanner unplugged"** in the sidebar (green **"Scanner ready"** when fine) and a banner on the pages that need the scanner |
| Gym PC tray icon | a Windows notification: "Scanner unplugged!" / "Scanner connected" |
| After plugging it back in | an amber **"Scanner reconnecting…"** step (kiosk, sidebar light and banner) for the few seconds it takes to start the scanner and load the fingerprints; it turns green only when check-in really works. A scan during that time is refused with "loading fingerprints" instead of a false "not recognized". |

The bridge checks Windows every 2 seconds. **Plug the cable back in and check-in works again by itself in about 2-5 seconds**: it
re-initialises the driver, reopens the scanner and re-downloads the fingerprints. Nobody has to restart anything, and the kiosk
screen returns to "Place your finger" on its own. A **"Check-in is offline"** screen means the bridge program itself is not running; the
watchdog normally brings it back within seconds, otherwise open ChaqBridge from the Start menu.

## Troubleshooting

* **"Scanner NOT connected", Init failed (-2)** → install the ZKTeco driver, replug the Live20R, make sure no other program (the SDK demo) is using it.
* **"Bridge is not running" banner** → start `ChaqBridge.exe`; check `http://localhost:5055/status` in a browser.
* **Bridge shows 0 templates / sync error** → check `BRIDGE_API_KEY` matches, the web app URL is reachable, then press *Sync templates now*.
* **Occasional database timeouts on some networks** → the app already retries connection failures (IPv4 preferred, 6 s timeout).

## Test checklist

- [ ] `npm run build` and `npm run lint` pass; `npm run migrate` and `npm run seed:admin` can be run twice without error.
- [ ] Login: wrong password is rejected; 5 wrong tries in a row → "too many attempts"; admin lands on the dashboard; a member lands on "coming soon".
- [ ] Member's first login forces a password change (8+ chars with letters and numbers).
- [ ] Opening `/admin`, `/kiosk` or an `/api/admin/*` URL while signed out (or as a member) is refused.
- [ ] Bridge: status window shows scanner connected; `http://localhost:5055/status` says `scannerConnected: true`; unplugging the scanner flips it to NOT connected within a few seconds.
- [ ] Unplug the scanner: kiosk shows "Scanner not connected", the admin sidebar turns red, a tray notification appears. Plug it back in: everything recovers by itself in seconds and a registered finger checks in again without restarting anything.
- [ ] Kill the bridge (Task Manager → end the `ChaqBridge.exe` that was started with `--worker`): it is back within a few seconds and `bridge.log` records the restart.
- [ ] Register a monthly member: scanning is disabled until name + consent; 1/3, 2/3, 3/3 progress; username/password preview matches `cruz2026` / `cruzChaq`; a second "Cruz" gets `cruz2026a`.
- [ ] Enrolling the same finger for a different member is rejected ("already registered").
- [ ] Register a walk-in; it appears under today's walk-ins and can be converted to a monthly member.
- [ ] Kiosk: registered finger → welcome + streak + week tiles; unknown finger → "Fingerprint not recognized, try again"; stop the bridge → red banner.
- [ ] Kiosk: second scan right away → "already checked in"; scan 2+ minutes later → checked out; scan after that → "already checked out".
- [ ] Expired member (set the expiry in the past) → "Membership expired, please renew" and **no** attendance row.
- [ ] Renewal: active member +30 days on top of the expiry; expired member → today + 30 days; each renewal adds the fixed ₱800 to income.
- [ ] Delete a member with "returned their money" ticked: a negative refund entry lowers income; without it the sales stay.
- [ ] Members page: search, status badges (green/yellow/red), edit name, re-enroll, reset password (back to default + forced change), delete.
- [ ] Streaks: consecutive days raise the tile color (light → purple → deep purple + fire → glowing); one missed day in a week keeps the streak (❄), a second breaks it.
- [ ] Badges: First Visit, 7-Day Fire, 30 Visits, Comeback (14+ days away) appear once each.
- [ ] Dashboard numbers match the data (active/expiring/expired, check-ins, walk-ins, income today/month, peak hours).
- [ ] Attendance history filters by date and name; CSV opens in Excel. Each report tab loads and exports CSV.
- [ ] Member app on a phone: first login forces a new password; Home shows the streak, week tiles and next badge; Board shows masked names and the member's own rank; Me shows badges and visits; the leaderboard switch hides/shows the member; a member cannot open `/admin` or `/api/admin/*`.
- [ ] Theme: the Light / Dark / System switch changes every page (login, admin, kiosk, dialogs, toasts), survives a reload, and "System" follows the PC setting.
- [ ] Railway readiness: variables set, `ADMIN_PASSWORD` changed, `/login` works over HTTPS, bridge `AllowedOrigins` updated.
