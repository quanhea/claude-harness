---
description: Generate docs/DESIGN.md (skips if not frontend)
outputs: ["docs/DESIGN.md"]
---

# Task: Generate docs/DESIGN.md

**Output:** `{{PROJECT_DIR}}/docs/DESIGN.md`

**Skip if not a frontend project.** If no `.tsx`/`.jsx`/`.vue`/`.svelte` files exist and no frontend framework configs (Next/Vite/Nuxt/Svelte/Angular) are present, write a one-line stub `# Design (N/A — not a frontend project)` and exit.

You are creating docs/DESIGN.md — the design system, component patterns, and UI conventions for this frontend project.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Detect design system or UI library (Tailwind, shadcn, MUI, styled-components, etc.)"
3. "Sample components directory for naming and structure patterns"
4. "Check for existing design tokens, theme files, or style constants"
5. "Check for Storybook or design system documentation"
6. "Write docs/DESIGN.md following the exact template"
7. "Verify component examples use actual components from the codebase"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Template

```markdown
# Design

Updated: {{today's date}}

## UI Framework

**Framework:** {{React / Vue / Svelte / Angular / etc.}}
**UI Library:** {{Tailwind CSS / shadcn/ui / MUI / Mantine / none}}
**Component docs:** {{Storybook URL or "Not configured"}}

## Component Conventions

**Naming:** `{{PascalCase / kebab-case}}`
**Location:** `{{src/components/ or pages/ or app/}}`
**Structure:**
```
{{ComponentName}}/
├── index.tsx          # Public export
├── {{ComponentName}}.tsx  # Implementation
└── {{ComponentName}}.test.tsx  # Tests
```

## Design Tokens

**Colors:** {{where defined — e.g. "tailwind.config.ts", "src/styles/tokens.ts"}}
**Typography:** {{where defined}}
**Spacing:** {{e.g. "Tailwind spacing scale"}}

## Patterns

### Data Fetching
{{e.g. SWR, React Query, useEffect, server components}}

### Forms
{{e.g. react-hook-form + zod, controlled components}}

### State Management
{{e.g. Zustand, Redux, Context API, server state only}}

### Error Boundaries
{{e.g. "Each page has an error boundary at src/components/ErrorBoundary.tsx"}}

## Accessibility

**Standard:** {{WCAG 2.1 AA / none defined}}
**Testing:** {{axe-core, manual, none}}
```

## Rules

- Only document patterns that EXIST in the codebase. Do not prescribe.
- If no design system is detected, write "No UI library configured — plain CSS/HTML."
- Component examples must use real component names found in the project.
