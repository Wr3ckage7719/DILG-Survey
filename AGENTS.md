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
2. Redeploy the web app (new deployment URL) and set Vercel env vars:
   - `APPS_SCRIPT_URL` (updated), `ADMIN_GS_SECRET` (same as `ADMIN_API_SECRET`),
     `ADMIN_PASSWORD` (optional first-line check, same value)
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
