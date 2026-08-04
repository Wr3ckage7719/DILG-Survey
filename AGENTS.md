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
