# DILG Survey — Project Rules

## Tech Stack
- React 18 + TypeScript + Vite
- Tailwind CSS v3 (@tailwindcss config, not v4)
- shadcn/ui with Radix UI primitives
- Framer Motion for animations
- next-themes for dark mode
- sonner for toasts
- lucide-react for icons

## Conventions
- Import path alias: `@/` maps to `src/`
- UI components in `src/components/ui/`
- All components are function components with TypeScript
- CSS variables from `src/index.css` for theming
- shadcn/ui style: default (not new-york)

## Code Style
- No JSX comments
- Concise, direct code
- Use existing component patterns
- Follow DILG branding: navy/gold color palette
- Forms use controlled components with Radix UI primitives

## Steps
1. Always load relevant skills via `skill` tool before working on a task
2. Prefer editing existing files over creating new ones
3. Run build to verify after changes when modifying config or deps
4. For UI changes, check all viewport sizes
5. For accessibility, use semantic HTML and proper ARIA attributes
