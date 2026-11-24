# My Fitness

A privacy-first, self-hostable PWA for daily weight, nutrition, habits, workout planning, and family motivation — built with **Next.js 16**, **React 19**, **Tailwind CSS v4**, and **Supabase**.

No ads, no third-party trackers, no external font CDNs, and no user account bloat.

## Features

- **Weight & Trend Tracking:** Daily weight logging with smoothed trend curves, goal pacing, and quick ±0.1 kg adjustments.
- **Nutrition & Meal Logging:** Calorie and macro tracking with a built-in food database, barcode scanning (Open Food Facts + `@zxing/browser`), optional AI meal estimation from text/photos, and automatic meal plan & recipe scaling.
- **Habits, Water & Sleep:** Daily habit rings, hydration counter, steps/sleep logging, and iOS widget/Shortcuts sync endpoint (`/api/widget`).
- **Workout Plans:** Structured exercise library and weekly routines.
- **Family & Household Mode:** Private motivation groups with emoji reactions and a shared household shopping list.
- **PWA & Offline-Ready:** Installable on iOS and Android, local-first state with cloud sync, offline photo queue, and Web Push reminders.

## Security & Privacy Architecture

- **Self-hosted fonts & assets:** Zero runtime calls to Google Fonts or third-party CDNs.
- **Fail-closed access gate:** Protected by server-side passphrase (`CLAVE_APP`) with brute-force rate limiting (`proxy.ts`).
- **Locked-down database:** Supabase Row Level Security (RLS) is enabled with deny-all default policies on every table; all data access goes through validated server routes.
- **Automated security audit:** Run `npm run auditar:seguridad` to check for secret leaks, open CORS, stack trace exposure, missing `alt` attributes, and external font calls.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling & Motion:** Tailwind CSS v4 + Motion + Lucide icons
- **Backend & Sync:** Supabase (PostgreSQL + RLS + RPCs)
- **Testing:** 57 Node unit test suites (`npm test`) + Playwright E2E suite

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

At minimum, set `CLAVE_APP` so the login gate opens locally. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to enable cloud sync.

### 3. Set up the database (optional for local-only mode)

Run the SQL files in order inside your Supabase SQL Editor:

1. `scripts/esquema-nube.sql`
2. `scripts/esquema-nube-2.sql`
3. `scripts/esquema-avisos.sql`
4. `sql/contadores-perfil.sql`, `sql/mutar_grupo_familiar.sql`, `sql/uso-ia-global.sql`

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
# Run all 57 unit test suites
npm test

# Run security & privacy audit
npm run auditar:seguridad

# Run linter
npm run lint
```

## License

Released under the [MIT License](LICENSE).
