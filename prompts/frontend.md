---
description: Generate docs/FRONTEND.md (skips if not frontend)
outputs: ["docs/FRONTEND.md"]
---

# Task: Generate docs/FRONTEND.md

**Output:** `{{PROJECT_DIR}}/docs/FRONTEND.md`

**Skip if not a frontend project.** If no `.tsx`/`.jsx`/`.vue`/`.svelte` files exist and no frontend framework configs (Next/Vite/Nuxt/Svelte/Angular) are present, write a one-line stub `# Frontend (N/A — not a frontend project)` and exit.

You are creating docs/FRONTEND.md — the rendering strategy, routing, build configuration, and performance conventions for this frontend project.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Detect rendering strategy (SSR, SSG, SPA, RSC)"
3. "Detect router and routing conventions"
4. "Read build config (next.config.ts, vite.config.ts, webpack.config.js)"
5. "Check for environment-specific config"
6. "Write docs/FRONTEND.md following the exact template"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Template

```markdown
# Frontend

Updated: {{today's date}}

## Rendering Strategy

**Strategy:** {{SSR (Next.js) / SSG / SPA / RSC / CSR}}
**Framework:** {{Next.js 14 / Nuxt 3 / SvelteKit / Vite / Create React App}}

## Routing

**Router:** {{Next.js App Router / Pages Router / React Router / Vue Router}}
**Convention:** {{file-based / manual}}
**Key routes:**

| Route | File | Purpose |
|-------|------|---------|
| `/` | {{file}} | {{purpose}} |
| `/api/*` | {{file}} | {{purpose}} |

## Build Configuration

**Config file:** {{next.config.ts / vite.config.ts / etc.}}

Key settings:
- {{e.g. "strict mode: enabled"}}
- {{e.g. "output: 'standalone' for Docker"}}
- {{e.g. "i18n: not configured"}}

## Environment Variables

**Pattern:** `NEXT_PUBLIC_` prefix for client-side variables.
**Config:** `.env.local` (dev), environment variables (prod).

## Performance

**Image optimization:** {{Next.js Image, manual, none}}
**Code splitting:** {{automatic / manual}}
**Bundle analyzer:** {{configured at, or "not configured"}}

## Testing

**Unit:** {{Vitest / Jest}} for component and utility tests
**E2E:** {{Playwright / Cypress / none}}
**Command:** `{{test command}}`
```

## Rules

- Only document what's configured in actual files.
- Routes table should use real routes found in the router config, not invented ones.
