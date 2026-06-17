<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# SecureApp — Project Status

A web application **security scanner UI**. Configure a scan against a target URL, watch
live scan progress, and review findings mapped to security standards (OWASP, CWE, SANS,
NIST, PCI-DSS, GDPR, ISO 27001).

- **Repo:** https://github.com/AbdulNandalpad/secureapp (branch `master`)
- **Live:** https://secureapp-tan.vercel.app/ (Vercel)

## Current state — what's built (as of 2026-06-17)

Everything below is **frontend-only and runs on mock data**. There is **no backend,
no API routes, no database, no auth, and no real scanning engine yet.**

### Stack
- Next.js **16.2.9**, React **19.2.4**, TypeScript 5
- Tailwind CSS **4** (`@tailwindcss/postcss`)
- Radix UI primitives (accordion, dialog, progress, select, tabs, tooltip)
- `lucide-react` icons, `recharts` charts, `class-variance-authority`, `clsx`, `tailwind-merge`

### Architecture
- **Single-page client app.** `src/app/page.tsx` is one big `"use client"` component that
  switches views with local `useState` — **there is no routing** (no extra files under `app/`).
- View state: `activeView` (scanner | dashboard | history | reports | alerts | settings)
  and `appState` (form | scanning | results).
- Dark theme, fixed left `Sidebar` + top `Header`, content in `<main>`.

### Views
| View | Status |
|------|--------|
| **Scanner** | Working (mock) — `ScanForm` → `ScanProgress` (simulated) → `ResultsDashboard` |
| **Dashboard** | Working (mock) — grade card, severity counts, recent findings, quick actions |
| **History** | Working (mock) — hardcoded list of 3 past scans |
| **Reports / Alerts / Settings** | Placeholders — "coming soon" empty state |

### Domain model — `src/lib/types.ts`
`Severity`, `ScanStatus`, `StandardCategory`, `VulnerabilityCheck`, `Finding`,
`ScanConfig`, `ScanProgress`, `ScanResult`, `Report`.

### Constants — `src/lib/constants.ts`
- `STANDARDS` — 8 standards (label/description/color)
- `SEVERITY_CONFIG` — 5 levels (critical → info) with colors
- `VULNERABILITY_CHECKS` — 20 checks (A01–A10, API1–3, SANS1, TLS1, HDR1, CSRF1, GDPR1, INFO1, OPEN1)
- `SCAN_PHASES` — 9 phases
- `GRADE_CONFIG` — A–F grades

### Mock data — `src/lib/mock-data.ts`
`MOCK_FINDINGS` (8 findings) + `MOCK_SCAN_RESULT`. All dashboards/results read from here.

### Components
- `components/layout/` — `Header`, `Sidebar`
- `components/scanner/` — `ScanForm`, `ScanProgress`, `ResultsDashboard`, `FindingDetail`
- `components/ui/` — `badge` (SeverityBadge), `button`
- `lib/utils.ts` — `cn()` helper

## Authentication & DB (Supabase) — in progress

Auth is wired with **Supabase** using `@supabase/ssr`. The whole app is gated behind login.

### Env (`.env.local` — not committed)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Files
- `src/lib/supabase/client.ts` — browser client (`createClient()`)
- `src/lib/supabase/server.ts` — server client; **`await createClient()`** (cookies are async in Next 16)
- `src/lib/supabase/proxy.ts` — `updateSession()`: refreshes session + redirects unauth → `/login`
- `src/proxy.ts` — **Next 16 renamed `middleware` → `proxy`**; wires `updateSession` with a matcher
- `src/app/login/page.tsx` — email/password sign-in + sign-up (client)
- `src/app/auth/callback/route.ts` — exchanges `code` for a session (email confirm / OAuth)
- `src/components/layout/Header.tsx` — shows the signed-in user + sign-out

### Database — `supabase/schema.sql`
Run it in the Supabase SQL editor. Creates `public.profiles` (id → `auth.users`, email,
full_name, created_at) with **RLS** (own-row select/update) and a trigger that
auto-creates a profile row on sign-up.

### Setup steps
1. Create a Supabase project; copy URL + anon key into `.env.local`.
2. Run `supabase/schema.sql` in the SQL editor.
3. Auth → URL Configuration: add `http://localhost:3000/auth/callback` (and the prod
   equivalent) as redirect URLs. To skip email confirmation in dev, disable
   "Confirm email" under Auth → Providers → Email.
4. `npm run dev`.

## AI is the core — every table is accessed through the AI/DAL layer

SecureApp is **AI-native**: the AI agent is the primary way data is read and written,
and it reaches the database **only** through a single Data Access Layer. The rule:

> **No code touches Supabase tables directly. Table access goes DAL → AI tools → agent.**

### The layers (bottom to top)
1. **DAL** — `src/lib/dal/<table>.ts`. The *only* place that queries a table. Each
   function takes a **user-scoped** Supabase server client, so **RLS is always enforced**
   (a user can only touch their own rows). Currently: `dal/profiles.ts`.
2. **AI tools** — `src/lib/ai/tools.ts`. Typed Claude tool definitions (`TOOL_DEFS`) +
   an `executeTool()` dispatcher that calls DAL functions. This is the AI's interface to
   the DB. Tool descriptions are prescriptive about *when* to call them.
3. **Agent** — `src/lib/ai/agent.ts`. `runAgent()` runs a manual tool-use loop on
   **`claude-opus-4-8`** (adaptive thinking, effort `medium`). Tools execute via the DAL,
   so auth/RLS applies to everything the agent does. Capped at `MAX_TURNS`.
4. **API** — `src/app/api/ai/route.ts`. `POST /api/ai`. **Auth-gated** (401 if no session);
   runs the agent as the signed-in user. Body: `{ messages: Anthropic.MessageParam[] }` →
   `{ reply: string }`.

### Adding a new table (the required pattern)
1. Add the table + RLS to `supabase/schema.sql`.
2. Add `src/lib/dal/<table>.ts` with user-scoped functions.
3. Register read/write tools for it in `src/lib/ai/tools.ts` (defs + `executeTool` cases).
   That's it — the agent can now use the new table. **Never** query the table from a
   component, route, or page directly.

### Claude usage rules (see the `claude-api` skill)
- Model is **`claude-opus-4-8`** — do not downgrade.
- Adaptive thinking only: `thinking: {type: "adaptive"}`. **Never** `budget_tokens`,
  `temperature`, `top_p`, `top_k` (all 400 on Opus 4.7/4.8).
- Effort via `output_config: {effort: ...}`.
- Env: `ANTHROPIC_API_KEY` in `.env.local`.

## Not built yet (the roadmap)
- Real scan engine / backend that actually probes a target
- API routes (`src/app/api/*`) — none exist
- Persisting scans/findings to the DB (schema beyond `profiles`); History/Dashboard still mock
- Report generation (PDF / JSON / HTML / CSV) — `Report` type exists, no implementation
- Alerts and Settings views

## Conventions
- Import the `cn()` helper from `src/lib/utils.ts` for class merging.
- Colors/labels for severities, standards, and grades come from `src/lib/constants.ts` —
  do not hardcode them inline.
- Domain types live in `src/lib/types.ts` — extend there, don't redefine shapes locally.
