# Chaq Gym Attendance (thesis project)

Fingerprint attendance + gamification (streaks, badges) for Chaq Gym. Full docs, setup, env vars, test checklist: `README.md` (don't re-read it unless needed; the essentials are below).

## Layout
- `web/` Next.js 16 + TS + Tailwind 4 + shadcn (base-ui). Admin UI, API, Neon Postgres (`pg`, no ORM).
- `bridge/` C# .NET 8 WinForms + ASP.NET minimal API on `localhost:5055`. Talks to ZKTeco Live20R. Never touches the DB; pulls templates from `GET /api/bridge/templates` (header `x-bridge-api-key`) every 3 min and matches in memory.

Flow: browser -> bridge (enroll/identify) -> browser -> web API (rules) -> DB.

## Web code map (`web/src`)
Layering, keep it: **route -> service -> data**. No SQL outside `data/`, no business rules in routes.
- `app/` pages: `admin/{attendance,leaderboard,members,register,reports}`, `kiosk`, `login`, `change-password`, `member` (placeholder)
- `app/api/admin/*` admin routes (each calls `requireRole("admin")`), `app/api/auth/*`, `app/api/bridge/templates`
- `services/` business rules: auth, checkin, dashboard, member, membership-rules, registration, report, streak
- `data/` all SQL: attendance, fingerprints, members, memberships, payments, reports, streaks, users, walkins
- `lib/` pure/helpers: accounts, badges, streak-rules, time, pricing, csv, db, env, guard, rate-limit, session, bridge-client
- `components/` UI (`ui/` = shadcn primitives); `proxy.ts` = Next 16 middleware replacement
- `db/migrations/NNN_*.sql` applied by `npm run migrate`. Tables: users, fingerprints, memberships, attendance, walkin_sessions, payments, streaks, badges, scan_log. **Add a new numbered migration; never edit applied ones.**

## Bridge (`bridge/`)
`ScannerService.cs` (ZKFinger SDK), `SyncService.cs`, `Api.cs`, `StatusForm.cs`, `BridgeConfig.cs`, `AppLog.cs`, `Program.cs`. Native DLLs are loaded from System32 on purpose (copies next to the exe fail with -2).

## Commands (run in `web/`)
`npm run dev | build | lint | migrate | seed:admin | reset:admin`. Bridge: `cd bridge; dotnet run -c Release`.
Verify web changes with `npm run lint` and `npm run build`.

## Rules / gotchas
- **Next.js 16 differs from training data.** Before writing Next code, check `web/node_modules/next/dist/docs/` for the relevant guide (see `web/AGENTS.md`).
- Business rules: fixed monthly fee (`MEMBERSHIP_PRICE`, default 800, server-enforced); username = lastname+`2026` (`cruz2026`, `cruz2026a`...), default password = lastname+`Chaq`, forced change at first login; check-in -> check-out after 2 min; expired members get no attendance row; renewal +30 days (from expiry if active, else from today); streak tolerates 1 missed day/week.
- Timezone `Asia/Manila` (`lib/time.ts`). Store only fingerprint templates, never images (RA 10173 consent before enrollment).
- Secrets live in `web/.env.local` and `bridge/appsettings.local.json`. Never print, commit, or copy them.
- Don't guess: if a file, function, or API isn't confirmed by reading it, say so instead of assuming.
- Keep answers short; change only what the task needs.

## Self-maintenance (automatic, user is not going to remind you)
- When a task adds, moves, renames, or deletes files/folders, tables, env vars, commands, or business rules, update the matching section of this file in the same turn. One line is enough.
- Don't paste long file lists or code here; keep it a map, under ~80 lines.
- When the user states a lasting preference ("always", "from now on"), add it under Workflow preferences.

## Workflow preferences
- Search with Grep/Glob first, read only the files the task touches (use the map above).
- For non-trivial changes: state a short plan, then edit.
- Don't run `git commit`/`push` unless asked.
