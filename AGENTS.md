# DILG Client Satisfaction Survey — Agent Guide

## Project Overview
A multi-step client satisfaction survey form for the Department of Interior and Local Government (DILG). Built with React 18 + TypeScript + Vite + Tailwind CSS v3 + shadcn/ui.

## Tech Stack
- **Runtime**: Node.js, Vite 6
- **Frontend**: React 18, TypeScript, Tailwind CSS v3
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Animation**: Framer Motion 12
- **State**: React hooks (useState, useCallback)
- **Notifications**: sonner
- **Icons**: lucide-react
- **Data**: Hardcoded survey questions, Google Forms-style submit

## Agents (Tab to switch, @ to invoke)

### Primary Agents (Tab-switchable)
| Agent | Color | Purpose |
|-------|-------|---------|
| `orchestrator` | Blue | Main coordinator — delegates to sub-agents, uses all skills and MCP |
| `plan` | Amber | Planning & analysis only (no edits) |
| `build` | (default) | Full development work |

### Sub-agents (@mentionable)
| Agent | Color | Purpose |
|-------|-------|---------|
| @ui-designer | Purple | UI/UX design, component polish, responsive layout |
| @animation-specialist | Pink | Framer Motion, Tailwind animations, page transitions |
| @code-reviewer | Green | Code quality review (read-only) |
| @accessibility-auditor | Teal | WCAG compliance audit (read-only) |
| @brand-consultant | Red | Brand identity & visual consistency |
| @documentation-writer | Indigo | Technical writing & docs |
| @skill-discoverer | Violet | Find & install new skills |

## Key Files
- `src/App.tsx` — Main app with form wizard logic
- `src/types.ts` — Form data types & constants
- `src/components/` — Step/section components
- `src/api/submit.ts` — Survey submission
- `src/data/questions.ts` — Question data
- `src/index.css` — Tailwind & CSS variables
- `src/components/ui/` — shadcn/ui components
- `src/admin/` + `src/api/admin.ts` — Admin dashboard (login, response list, print views)
- `api/` — Vercel serverless functions (`submit.ts` + `admin.ts`). IMPORTANT: Vercel compiles each `api/*` file standalone and does NOT trace local imports (shared modules anywhere outside the file are missing at runtime: `ERR_MODULE_NOT_FOUND`). Keep each function self-contained — only `node:` builtins. `admin.ts` serves all three admin routes via rewrites in `vercel.json` (`/api/admin/login|responses|print` → `/api/admin?route=...`).
- `apps-script/` — Google Apps Script project (clasp); `WebEndpoint.js` is the web app endpoint

## Admin Dashboard (`/admin`)
Password-protected response viewer at `/admin`. The browser only ever talks to the Vercel
functions (`/api/admin/*`) — the Google Apps Script URL never reaches the client. The
Apps Script re-verifies every request behind the Vercel layer (defense in depth).

**Setup (one-time):**
1. Apps Script → Extensions → Properties → Script properties:
   - `ADMIN_API_SECRET` — long random string
   - `ADMIN_PASSWORD` — the admin login password
   - `RESPONSES_TAB_NAME` — optional: pin the tab that holds survey responses
     (mirrors Vercel's `SHEET_TAB_NAME`; default detection: `Form Responses 1`
     → first tab with a Reference Number column). If the admin list or printed
     docs show the wrong rows, this is the fix.
2. Redeploy the web app (new deployment URL) and set Vercel env vars:
   - `APPS_SCRIPT_URL` (updated), `ADMIN_GS_SECRET` (same as `ADMIN_API_SECRET`)
   - Do NOT set `ADMIN_PASSWORD` on Vercel — the password lives ONLY in the Apps
     Script `ADMIN_PASSWORD` property (single source of truth). Changing the
     password in the Settings sidebar takes effect immediately, no redeploys.
     (The Vercel layer skips its first-line password check when the env var is
     unset; the Apps Script check remains authoritative.)
   - If the new deployment URL differs from the `WEBAPP_URL` constant in
     `apps-script/WebEndpoint.js` (or the `WEBAPP_URL` script property), update
     it too — the keep-warm trigger pings that URL, and a stale one lets the
     live deployment go cold (~20–40s per admin login/fetch).
3. Local dev: put `ADMIN_GS_SECRET` in `.env` — the Vite proxy (`vite.config.ts`) injects
   it into the Apps Script URL, so dev talks to the same security model as prod.

**Security notes (intentional, do not "fix" blindly):**
- Session tokens are HMAC-SHA256 with a 4h expiry; minted and verified in Apps Script,
  re-verified in the Vercel layer. Not IP-bound — mitigated by a per-IP rate limit on the
  responses endpoint (30/min) and `Cache-Control: no-store`.
- Login is throttled at two layers (Vercel: 5/IP/15min; Apps Script cache: 10/10min). An
  attacker can still exhaust a victim's quota by hammering the login — accepted tradeoff.
- `ADMIN_GS_SECRET` travels in the query string of server-to-server calls (GAS web apps
  can't read custom headers). If the Apps Script project's Cloud/audit logging is ever
  enabled, request URLs including `?secret=` may be logged — rotate the secret if logs
  are shared.

## Survey Submit Fast Path (`/api/submit` — Sheets API v4)
**Status (prod): ENABLED** — `GOOGLE_SA_KEY` + `SPREADSHEET_ID` set on Vercel,
tab pinned via `SHEET_TAB_NAME=Survey Data`. Verified live (2026-08-12): submit
returns `via:"sheets"` in ~2s end-to-end (was 6–31s via Apps Script).

`api/submit.ts` writes responses straight to Google Sheets via the Sheets API v4,
bypassing the Apps Script `/exec` edge (the source of 12–40s round trips). This is
the ONLY mechanism that gets the client's success screen under 5s — the Apps
Script path cannot be made reliably faster from the server side. Falls back to the
Apps Script write on any failure (and for the GET ?ref= lookup too). Enabled when
BOTH env vars below are set; the response includes `via` (`sheets` | `sheets-dedupe`
| `apps-script`).

**Setup (optional, one-time):**
1. Google Cloud Console → enable **Google Sheets API** on your Apps Script project.
2. Create a service account (IAM & Admin → Service Accounts → Create → Keys → JSON).
3. Open the survey spreadsheet → Share → add the service account `client_email`
   from the JSON key as **Editor**.
4. Vercel → Project Settings → Environment Variables:
   - `GOOGLE_SA_KEY` — the full service-account JSON key (single line, escaped)
     — or base64 of it. Aliases accepted: `SERVICE_ACCOUNT_KEY`.
   - `SPREADSHEET_ID` — the id from the spreadsheet URL (`/spreadsheets/d/<id>/`).
     Alias accepted: `SHEETS_FAST_PATH_SPREADSHEET_ID`.
   - `SHEET_TAB_NAME` — optional: pin the tab (default: `Form Responses 1`, else
     the first tab containing the survey headers).
5. Vercel → Redeploy. Until both env vars are set, the server silently uses the
   Apps Script path — safe to roll out gradually.

Notes: dedupe = the write checks the Reference Number column first (mirrors the
Apps Script `doPost`), so a retry with the same ref never double-writes; the daily
Apps Script `cleanupDuplicateRefs` trigger is the last-resort sweep. Fast path
touches ONLY how a survey row enters the sheet — document generation (admin
`doAdminPrint` → TemplateEngine.js) reads the same sheet by header name and is
unaffected. Rollback: unset `GOOGLE_SA_KEY`/`SPREADSHEET_ID` → behavior reverts
to today.

## Skills Available
Design & Visual: design, design-system, ui-styling, ui-ux-pro-max, frontend-design, banner-design
UI Libraries: shadcn-ui, react-tailwind, react-frontend
Animation: framer-motion-animator, page-transitions, tailwindcss-animations
Quality: web-design-guidelines
Brand: brand
Content: slides
Utility: find-skills

## MCP Tools Available
- `gh_grep` — Search code on GitHub (use "use the gh_grep tool")
- `context7` — Search documentation (use "use context7")

## Commands
- `/dev` — Start dev server
- `/build` — Production build
- `/review` — Code review with @code-reviewer
- `/audit-a11y` — Accessibility audit
- `/polish-ui` — UI polish pass
