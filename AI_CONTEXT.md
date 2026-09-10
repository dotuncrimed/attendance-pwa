# AI Context — Employee Attendance PWA

> **IMPORTANT**: Read this file completely before making any changes. This file describes the business rules, architecture, and conventions of the project. Breaking these rules will cause wrong data, incorrect durations, or role permission leaks.

## 1. Project Overview

A QR-code-based employee time-attendance system for a warehouse. Built as a **Next.js PWA** deployed on **Vercel**, using **Supabase** as the database and auth provider.

**Three user roles:**
- `admin` — Full access to everything
- `supervisor` — Can add employees, view dashboards/durations/logs, export CSV. Cannot delete/edit employees, cannot manage users, cannot access settings.
- `guard` — Can only scan QR codes at the gate.

---

## 2. Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js (App Router) |
| Language | Mix of `.tsx` and `.js` files (both coexist) |
| Database & Auth | Supabase (Postgres + GoTrue) |
| Hosting | Vercel (free tier) |
| QR Scanner (Guard) | `html5-qrcode` |
| QR Generator (Admin) | `qrcode.react` |
| Styling | **Inline styles only** (no Tailwind, no CSS modules) |

---

## 3. File Structure

```
attendance-pwa/
├── app/
│   ├── admin/page.tsx          # Admin dashboard (Dashboard/Durations/Reports/Employees/Logs/Users/Settings)
│   ├── supervisor/page.tsx     # Supervisor dashboard (Dashboard/Durations/Employees/Reports)
│   ├── guard/page.tsx          # QR scanner
│   ├── login/page.tsx          # Login form
│   ├── api/
│   │   ├── employees/route.ts      # GET/POST/PUT/DELETE employees
│   │   ├── scan/route.ts           # POST — processes QR scans (IN/OUT logic lives here!)
│   │   ├── status/route.ts         # GET — who's currently inside
│   │   ├── durations/route.ts      # GET — durations with date picker (?date=YYYY-MM-DD)
│   │   ├── logs/route.ts           # GET — recent logs
│   │   ├── summary/route.ts        # GET — summary with date range
│   │   ├── export/route.ts         # GET — attendance CSV export
│   │   ├── export-durations/route.ts  # GET — duration summary CSV
│   │   ├── generate-qr/route.ts    # POST — generate new QR token
│   │   ├── users/route.ts          # GET/POST/DELETE — manage Supabase auth users
│   │   ├── archive/route.ts        # DELETE — purge old logs
│   │   └── health/route.js         # Connection test
│   └── layout.tsx
├── lib/
│   ├── supabaseClient.js       # Browser client (anon key)
│   └── supabaseAdmin.js        # Server client (service_role key) — used in all API routes
├── public/
│   ├── manifest.json
│   ├── icon-192.png
│   └── icon-512.png
├── .env.local                  # Local env vars (NEVER push)
└── AI_CONTEXT.md               # ← You are reading this
```

---

## 4. Database Schema (Supabase)

### `public.profiles`
Linked 1:1 to `auth.users` by `id`.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| full_name | text | |
| role | text | Must be `'admin'`, `'supervisor'`, or `'guard'` (CHECK constraint) |
| active | boolean | |

### `public.employees`
| Column | Type |
|---|---|
| id | uuid PK |
| employee_no | text UNIQUE |
| full_name | text |
| department | text |
| position | text |
| photo_url | text |
| active | boolean |

### `public.qr_tokens`
Stores **hashed** QR content. Plain text is never stored.

| Column | Type |
|---|---|
| id | uuid PK |
| employee_id | uuid FK → employees |
| token_hash | text UNIQUE (SHA-256 of plain token) |
| active | boolean |

QR format is `ATT1:<random-hex>`. Hash is `sha256(plain).hex`.

### `public.attendance_logs`
| Column | Type |
|---|---|
| id | bigint identity |
| employee_id | uuid FK |
| direction | text CHECK('in','out') |
| scanned_at | timestamptz |
| guard_id | uuid FK |
| entrance | text |
| device_id | text |
| source | text (default 'qr') |
| note | text |
| idempotency_key | uuid UNIQUE |

---

## 5. ⚠️ CRITICAL BUSINESS RULES

### 5.1 IN/OUT Detection
The system **auto-detects** direction. The last log's direction determines the next:
- Last was `in` → next is `out`
- Last was `out` → next is `in`
- No previous log → default to `in`

### 5.2 Timezone: UTC+8 (Asia/Manila) ONLY
The server runs in UTC. **All time logic must explicitly use `Asia/Manila`** timezone:

```js
// Get today's date string in UTC+8
const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
// => "2026-01-26"

// Build day boundaries
const dayStart = new Date(`${todayStr}T00:00:00+08:00`).toISOString();
const dayEnd   = new Date(`${todayStr}T23:59:59+08:00`).toISOString();

// Format for display
new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Manila", hour12: true });
```

Never use `new Date().toDateString()` directly — it gives the wrong day.

### 5.3 🚨 "Went Home" Logic (MOST IMPORTANT RULE)

This is the logic in `app/api/durations/route.ts` and `app/api/export-durations/route.ts`. It is **deliberate and must not be changed without discussion**:

> **Rule**: Outside time gaps between scans are **always counted fully**, no matter how long. The only time that is discarded is the **trailing OUT at the end of the day** (when the employee went home and never came back).

Example walkthrough for one day:

| Time | Action | Inside counted | Outside counted |
|---|---|---|---|
| 8:00 | IN | starts | — |
| 12:00 | OUT | +4h | — |
| 15:30 | IN (3.5h break) | — | **+3h30m** ← YES, counted! |
| 18:00 | OUT | +2h30m | — |
| *(goes home, never returns)* | trailing OUT | — | **NOT counted** ← went home |

**Totals**: Inside 6h30m, Outside 3h30m.

**Live hint (today only)**: If the employee is currently outside for **≥ 2 hours** with no new IN scan, display a `🏠 Went Home` badge. This is a UI hint only — it does not affect calculations.

**Past-date review**: If reviewing a past day that ended with a trailing IN (forgot to scan OUT), count inside until 23:59:59 of that day and flag with `⚠️ No OUT recorded`.

### 5.4 Duplicate Scan Prevention
The `/api/scan` endpoint rejects scans if the same employee scanned the same direction within the last 30 seconds.

### 5.5 One Active QR per Employee
Generating a new QR automatically deactivates all previous tokens for that employee.

---

## 6. Roles & Permissions Matrix

| Feature | Admin | Supervisor | Guard |
|---|---|---|---|
| Login page | ✅ | ✅ | ✅ |
| QR Scanner | ✅ | ❌ | ✅ |
| Dashboard (who's inside) | ✅ | ✅ | ❌ |
| Durations tab (with date picker) | ✅ | ✅ | ❌ |
| Reports tab | ✅ | ✅ | ❌ |
| Add employees | ✅ | ✅ | ❌ |
| Edit/Delete employees | ✅ | ❌ | ❌ |
| Generate QR codes | ✅ | ❌ | ❌ |
| View Logs | ✅ | ✅ | ❌ |
| Export CSV | ✅ | ✅ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Archive (delete old logs) | ✅ | ❌ | ❌ |

**Routing rule** in `app/login/page.tsx` and each `page.tsx`: each page checks the user's `profiles.role` and redirects unauthorized users to their correct page.

---

## 7. API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Connection check |
| GET | `/api/employees` | List employees |
| POST | `/api/employees` | Add employee |
| PUT | `/api/employees` | Update employee |
| DELETE | `/api/employees` | Deactivate employee (sets active=false) |
| POST | `/api/scan` | Process QR scan, log IN/OUT |
| GET | `/api/status` | Who's currently inside/outside |
| GET | `/api/durations?date=YYYY-MM-DD` | Today's or specific day's durations |
| GET | `/api/logs` | Recent logs |
| GET | `/api/summary?startDate=&endDate=` | Summary report |
| GET | `/api/export?startDate=&endDate=` | CSV of raw logs |
| GET | `/api/export-durations?period=today\|week\|month` or `?date=YYYY-MM-DD` | Duration summary CSV |
| POST | `/api/generate-qr` | Generate QR for employee |
| GET | `/api/users` | List auth users |
| POST | `/api/users` | Create auth user (uses `supabase.auth.admin.createUser`) |
| DELETE | `/api/users` | Delete auth user |
| DELETE | `/api/archive` | Purge logs older than N months |

All API routes start with `// @ts-nocheck` and use `getSupabaseAdmin()` from `lib/supabaseAdmin.js`.

---

## 8. Coding Conventions

### 8.1 TypeScript bypass
Every `.ts`/`.tsx` file starts with:
```ts
// @ts-nocheck
```
This was added early on to avoid type errors. Keep it at the top of every new file.

### 8.2 Inline styles only
No Tailwind, no CSS modules, no `globals.css` edits. All styling is done via inline styles using a shared design system.

**Design System**: `/lib/styles.ts` contains centralized design tokens:
- `colors` - Professional color palette (primary, success, danger, warning, info)
- `spacing` - Consistent spacing scale (xs, sm, md, lg, xl, 2xl, 3xl, 4xl)
- `borderRadius` - Border radius values (sm, md, lg, xl, 2xl, full)
- `fontSize` - Typography scale (xs through 4xl)
- `fontWeight` - Font weights (normal, medium, semibold, bold)
- `typography` - Font family and heading/body presets
- `commonStyles` - Reusable component styles (card, input, buttons, badges)

Import and use in pages:
```tsx
import { colors, spacing, borderRadius, fontSize, fontWeight, typography } from "../lib/styles";

const styles = {
  container: { background: colors.bgPrimary, padding: spacing.xl },
  button: { ...commonStyles.primaryButton }
};
```

### 8.3 API route pattern
Every API route uses:
```ts
// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
export const dynamic = "force-dynamic";
```

### 8.4 Date formatting
Always use `Asia/Manila` timezone when formatting dates for display or CSV. See section 5.2.

---

## 9. Environment Variables

In `.env.local` (local) and Vercel env vars (production):

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (**never** expose to browser) |

`lib/supabaseClient.js` uses the anon key (browser-safe).
`lib/supabaseAdmin.js` uses the service role key (server-only).

---

## 10. PWA

The app is installable as a PWA on Android/iOS:
- `public/manifest.json`
- `public/icon-192.png`, `public/icon-512.png`
- Linked in `app/layout.tsx` via the `manifest` metadata field

---

## 11. Common Tasks Cheatsheet

- **Add a new role** → Update CHECK constraint on `profiles.role` via SQL Editor, add branch in `login/page.tsx`, create `app/[role]/page.tsx`.
- **Add a new API** → Create `app/api/[name]/route.ts`, add `// @ts-nocheck`, use `getSupabaseAdmin()`.
- **Change the "went home" threshold** → Edit `WENT_HOME_HINT_MINUTES` in `app/api/durations/route.ts` (live hint only; no calculation threshold exists by design).
- **Add a new column to employee** → ALTER TABLE in Supabase SQL Editor, update `app/api/employees/route.ts` GET/POST/PUT, update admin + supervisor tables.

---

## 12. Gotchas (Don't Break These!)

1. **Do not remove `// @ts-nocheck`** — the project was built without strict types.
2. **Do not convert inline styles to Tailwind** — would require rewriting every page.
3. **Do not change the IN/OUT direction logic** in `/api/scan` without testing the "went home" scenario.
4. **Do not use `new Date()` directly for day boundaries** — always use the UTC+8 pattern in 5.2.
5. **Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser** — it is server-only.
6. **Do not hard-delete logs or employees** — the project uses soft-delete (`active=false`). The archive API is the only hard-delete.
7. **Vercel auto-deploys on push to `main`** — always `npm run dev` locally before pushing.
