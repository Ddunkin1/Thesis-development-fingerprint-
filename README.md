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
* Settings (`appsettings.json`, overridden by `appsettings.local.json` and env vars): `WebAppUrl`, `AllowedOrigins`, `SyncMinutes`, `Port`, `ApiKey`.
  Env var forms: `Bridge__WebAppUrl`, `ALLOWED_ORIGINS` (comma separated), `BRIDGE_API_KEY`.
* To make a standalone copy for the gym PC: `dotnet publish -c Release -o publish`, copy `publish/` to the PC and put a shortcut to
  `ChaqBridge.exe` in `shell:startup` so it starts at login. The target PC needs the .NET 8 **Desktop + ASP.NET Core runtime** and the ZKTeco driver.
* **Why the DLLs are not next to the exe:** copies of `libzkfp.dll` & friends in the app folder fail to initialise (error -2) while the
  driver-installed ones in `System32` work, so the bridge uses those. `bridge/native/` keeps a reference copy (git-ignored).

Bridge API: `GET /status`, `GET /enroll/progress`, `POST /enroll`, `POST /identify`, `POST /sync`, `POST /cancel`.
CORS only allows the origins in `AllowedOrigins`; other origins get 403.

### Using it

1. **Register** (admin) → monthly member (full name, consent, 3-scan enrollment, optional backup finger, payment) or walk-in.
   Username = lastname + `2026` (`cruz2026`, then `cruz2026a`…), default password = lastname + `Chaq`; the member must change it at first login.
2. **Kiosk** (`/kiosk`) → fullscreen check-in screen; leave it open on the front-desk PC next to the bridge.
3. **Members / Attendance / Reports / Leaderboard / Dashboard** in the admin menu.

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
   `BRIDGE_API_KEY`, `SESSION_SECRET`, `APP_TIMEZONE=Asia/Manila`. `PORT` is provided by Railway.
   **Change `ADMIN_PASSWORD` to a strong one first** (the dev value is only for localhost).
4. Generate a public domain, deploy, then run the admin seed once: `railway run npm run seed:admin` (or temporarily set it as the pre-deploy command).
5. On the gym PC set `WebAppUrl` and `AllowedOrigins` in `bridge/appsettings.local.json` to the Railway URL
   (`https://<your-app>.up.railway.app`) and keep the same `BRIDGE_API_KEY`.
6. Use Chrome/Edge on the gym PC: the first time the Railway site calls `http://localhost:5055` the browser asks to allow
   "local network access"; choose **Allow**. (Safari blocks https→http localhost.)
7. Consider a separate Neon branch for development and `production` for Railway.

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
- [ ] Register a monthly member: scanning is disabled until name + consent; 1/3, 2/3, 3/3 progress; username/password preview matches `cruz2026` / `cruzChaq`; a second "Cruz" gets `cruz2026a`.
- [ ] Enrolling the same finger for a different member is rejected ("already registered").
- [ ] Register a walk-in; it appears under today's walk-ins and can be converted to a monthly member.
- [ ] Kiosk: registered finger → welcome + streak + week tiles; unknown finger → "Fingerprint not recognized, try again"; stop the bridge → red banner.
- [ ] Kiosk: second scan right away → "already checked in"; scan 2+ minutes later → checked out; scan after that → "already checked out".
- [ ] Expired member (set the expiry in the past) → "Membership expired, please renew" and **no** attendance row.
- [ ] Renewal: active member +30 days on top of the expiry; expired member → today + 30 days; each renewal appears in payments/income.
- [ ] Members page: search, status badges (green/yellow/red), edit name, re-enroll, reset password (back to default + forced change), delete.
- [ ] Streaks: consecutive days raise the tile color (light → purple → deep purple + fire → glowing); one missed day in a week keeps the streak (❄), a second breaks it.
- [ ] Badges: First Visit, 7-Day Fire, 30 Visits, Comeback (14+ days away) appear once each.
- [ ] Dashboard numbers match the data (active/expiring/expired, check-ins, walk-ins, income today/month, peak hours).
- [ ] Attendance history filters by date and name; CSV opens in Excel. Each report tab loads and exports CSV.
- [ ] Railway readiness: variables set, `ADMIN_PASSWORD` changed, `/login` works over HTTPS, bridge `AllowedOrigins` updated.
