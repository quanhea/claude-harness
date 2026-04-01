# claude-harness — Implementation Plan

> An open-source npm framework that scaffolds any project (< 1M LOC) for agent-first development with Claude Code — applying every principle from OpenAI's "Harness Engineering" article.

## Philosophy

**One liner. Zero runtime. Full leverage.**

```bash
npx claude-harness init
```

The framework is a **scaffolding + convention generator**, not a runtime wrapper. After `init`, the user's repo contains everything Claude Code needs to operate at maximum effectiveness. No lock-in, no runtime dependency — just `.claude/`, `docs/`, and architecture enforcement baked into the repo.

### Core Principles (from article)

1. **CLAUDE.md as table of contents** — ~100 lines pointing to deeper docs, not a monolithic manual
2. **Progressive disclosure** — agents start small, discover context as needed
3. **Repository knowledge as system of record** — if it's not in the repo, it doesn't exist for the agent
4. **Agent legibility over human aesthetics** — optimize for Claude's reasoning
5. **Enforce architecture mechanically** — linters, structural tests, not prose
6. **Garbage collection** — continuous quality enforcement, not Friday cleanups
7. **Golden principles encoded in code** — taste captured once, enforced everywhere
8. **Increasing autonomy** — each capability unlocked enables the next

## Architecture

```
npx claude-harness init    → Analyze project → Generate scaffolding → Done
npx claude-harness sync    → Re-analyze → Update stale docs → Done  
npx claude-harness learn   → Read conversation history → Generate skills → Done
```

### What Gets Generated

```
project/
├── .claude/
│   ├── CLAUDE.md              # Table of contents (~100 lines)
│   ├── settings.json          # Permissions, hooks, env
│   ├── settings.local.json    # Gitignored personal overrides (template)
│   ├── skills/
│   │   ├── harness-sync/      # /harness-sync — re-analyze and update docs
│   │   │   └── SKILL.md
│   │   ├── harness-review/    # /harness-review — architecture-aware code review
│   │   │   └── SKILL.md
│   │   ├── harness-plan/      # /harness-plan — create execution plan
│   │   │   └── SKILL.md
│   │   └── harness-quality/   # /harness-quality — grade quality per domain
│   │       └── SKILL.md
│   ├── rules/
│   │   ├── architecture.md    # Enforced architecture rules
│   │   ├── testing.md         # Testing conventions (path-scoped to *.test.*)
│   │   └── documentation.md   # Doc maintenance rules
│   └── agents/
│       ├── reviewer.md        # Code review agent
│       ├── architect.md       # Architecture analysis agent
│       └── gardener.md        # Doc-gardening agent
├── docs/
│   ├── ARCHITECTURE.md        # Auto-generated architecture map
│   ├── QUALITY.md             # Quality scores per domain
│   ├── design-docs/
│   │   └── index.md
│   ├── exec-plans/
│   │   ├── active/
│   │   └── completed/
│   ├── product-specs/
│   │   └── index.md
│   ├── references/
│   │   └── index.md
│   └── encyclopedia/
│       └── index.md           # Generated from codebase analysis
├── ARCHITECTURE.md            # Symlink → docs/ARCHITECTURE.md
└── .gitignore                 # Updated with .claude/settings.local.json
```

## Implementation Phases

### Phase 1: Package Scaffold
- `package.json` with `bin` field for `claude-harness` CLI
- TypeScript setup (tsconfig, build)
- Minimal CLI with commander: `init`, `sync`, `learn`
- ESM-only, Node >= 18

### Phase 2: Project Analyzer (`src/analyzers/`)
Static analysis — no API calls needed:
- **project.ts** — Detect language(s), framework(s), package manager, monorepo
- **structure.ts** — Map directory tree, identify domains/modules, count LOC
- **git.ts** — Read git history for patterns (commit frequency, active areas)
- **existing.ts** — Detect existing .claude/ setup, CLAUDE.md, docs/

### Phase 3: Template Engine (`src/templates/`)
- EJS templates for all generated files
- Context-aware: templates receive analyzer output
- Idempotent: re-running doesn't clobber user edits (merge strategy)

### Phase 4: Core Generators (`src/generators/`)
- **claude-md.ts** — Generate table-of-contents CLAUDE.md
- **settings.ts** — Generate settings.json with sensible defaults
- **docs.ts** — Create docs/ directory structure
- **architecture.ts** — Generate ARCHITECTURE.md from code analysis
- **rules.ts** — Generate path-scoped rules
- **agents.ts** — Generate agent definitions
- **skills.ts** — Generate project-embedded skills
- **gitignore.ts** — Update .gitignore

### Phase 5: Conversation Learner (`src/learner/`)
Uses `@anthropic-ai/claude-agent-sdk` session APIs:
- **sessions.ts** — Read session history from SDK (listSessions, getSessionMessages)
- **patterns.ts** — Extract recurring patterns (commands, workflows, file groups)
- **skill-generator.ts** — Turn patterns into `.claude/skills/`

### Phase 6: Encyclopedia Generator (`src/encyclopedia/`)
Uses `@anthropic-ai/claude-agent-sdk` query API:
- **analyzer.ts** — Deep codebase analysis via Claude
- **generator.ts** — Generate comprehensive docs/encyclopedia/
- **quality.ts** — Grade each domain, generate QUALITY.md

### Phase 7: Sync Command
- Diff current state vs generated state
- Update stale docs, re-grade quality
- Preserve user edits (3-way merge for CLAUDE.md)

### Phase 8: Testing & Polish
- Unit tests for analyzers and generators
- Integration test: init on a sample project
- README.md, LICENSE

## Package Dependencies

**Runtime (minimal):**
- `commander` — CLI framework
- `glob` — File pattern matching
- `ejs` — Template rendering
- `@anthropic-ai/claude-agent-sdk` — For `learn` and `encyclopedia` commands only

**Dev:**
- `typescript`
- `vitest`
- `@types/node`
- `@types/ejs`
- `tsup` — Build/bundle

## API Surface

```typescript
// Programmatic API (for advanced users)
import { init, sync, learn } from 'claude-harness'

await init({ cwd: '/path/to/project' })       // Same as CLI init
await sync({ cwd: '/path/to/project' })       // Same as CLI sync
await learn({ cwd: '/path/to/project' })      // Same as CLI learn
```

That's it. Three functions. The CLI is the primary interface.

## File Budget

| Component | Est. Files | Est. LOC |
|-----------|-----------|----------|
| CLI + commands | 4 | ~200 |
| Analyzers | 4 | ~400 |
| Generators | 8 | ~600 |
| Templates | 15 | ~800 |
| Learner | 3 | ~300 |
| Encyclopedia | 3 | ~300 |
| Tests | 8 | ~400 |
| Config/docs | 5 | ~200 |
| **Total** | **~50** | **~3,200** |

## Execution Order

1. ✅ Write plan.md
2. Package scaffold (package.json, tsconfig, CLI entry)
3. Project analyzer (static analysis)
4. Template engine + templates
5. Core generators (CLAUDE.md, settings, docs, architecture, rules, agents, skills)
6. `init` command wiring (analyzer → generators → write)
7. Conversation learner (SDK session reading + pattern extraction)
8. `learn` command wiring
9. `sync` command
10. Encyclopedia generator
11. Tests
12. README + LICENSE
13. Final polish + npm publish prep
