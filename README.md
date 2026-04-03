# claude-harness

A Claude Code plugin that scaffolds any project for agent-first development.

One command. Full scaffold. No build step.

```
/setup-harness
```

## What It Does

Applies every practice from the [Harness Engineering](https://openai.com/index/harness-engineering/) article to your project:

- **CLAUDE.md as table of contents** (~100 lines) pointing to deeper docs
- **`docs/` as system of record** — architecture, quality grades, design docs, exec plans, core beliefs, tech debt tracker
- **Custom linters as hooks** — file size, naming, structured logging, architecture direction, boundary validation
- **Rules enforced mechanically** — architecture boundaries, testing conventions, doc maintenance
- **Project-embedded skills** — `/sync`, `/review`, `/plan`, `/quality`
- **Specialized agents** — `@reviewer`, `@architect`, `@gardener`
- **Agent-to-agent review loop** (Ralph Wiggum Loop) — iterate until all reviewers satisfied
- **Garbage collection** — recurring scan for drift, dead code, stale docs
- **Progressive disclosure** — small entry point, pointers to depth

## Install

```bash
# From marketplace (when published)
claude plugin install claude-harness

# From local directory
claude --plugin-dir /path/to/claude-harness
```

## Usage

### Initial Setup

```
/setup-harness
```

This analyzes your project (language, framework, structure) and generates:

```
.claude/
├── CLAUDE.md              # Table of contents (~100 lines)
├── settings.json          # Permissions for your stack
├── rules/                 # Architecture, testing, doc rules
├── skills/                # sync, review, plan, quality
└── agents/                # reviewer, architect, gardener

docs/
├── ARCHITECTURE.md        # Module boundaries, dependency rules
├── QUALITY_SCORE.md             # Quality grades per domain
├── design-docs/
│   ├── index.md
│   └── core-beliefs.md    # Agent-first operating principles
├── exec-plans/
│   ├── active/
│   ├── completed/
│   └── tech-debt-tracker.md
├── generated/             # Auto-generated docs (db schema, API endpoints)
├── product-specs/
├── references/            # External llms.txt and API docs
└── encyclopedia/          # Auto-generated codebase knowledge
```

### Plugin Skill

The plugin provides ONE skill:

```
/setup-harness
```

This generates everything. After setup, your project has its own embedded skills and agents.

### Generated Project Skills

These are created in YOUR repo by `/setup-harness`:

| Skill | What it does |
|-------|-------------|
| `/sync` | Re-analyze and update stale docs |
| `/review` | Architecture-aware code review |
| `/plan <task>` | Create structured execution plan |
| `/quality` | Grade quality per domain |
| `/ci-check` | Check CI status, diagnose failures |

Plus custom skills generated from your conversation history.

### Generated Agents

| Agent | When to use |
|-------|-------------|
| `@reviewer` | Delegate code review |
| `@architect` | Analyze architecture health |
| `@gardener` | Find stale docs, quality drift, PR feedback patterns |

## Custom Linters (from the article)

`/setup-harness` generates **project-specific linter scripts** based on what it discovers in YOUR codebase. No hardcoded rules — every check comes from your project's actual conventions.

Linters are generated at `.claude/hooks/` and wired into `.claude/settings.json` PostToolUse hooks. They run after every `Edit`/`Write` and inject remediation into agent context.

What gets generated depends on your project:
- **File size** — if your project has a convention (discovered from existing lint config or file size patterns)
- **Naming** — if your project has consistent naming (discovered by scanning existing files)
- **Structured logging** — if your project uses a structured logger and bans raw print/console
- **Architecture deps** — if your project has layer boundaries documented in ARCHITECTURE.md
- **Boundary validation** — if your project uses schema validation at entry points

Additional scripts bundled with the plugin (not project-specific):

| Script | What It Does |
|--------|-------------|
| **validate-docs.sh** | Check knowledge base structure, cross-links, freshness |
| **grade-quality.sh** | Automated quality metrics per domain |

## Every Article Practice Implemented

| # | Article Practice | Implementation |
|---|---|---|
| 1 | CLAUDE.md as table of contents (~100 lines) | Template + lint-file-size validates it stays under 100 |
| 2 | `docs/` as structured knowledge base | Templates for ARCHITECTURE, QUALITY, design-docs, exec-plans, product-specs, references, encyclopedia, generated |
| 3 | Core beliefs document | `docs/design-docs/core-beliefs.md` template |
| 4 | Custom linters for dependency direction | `lint-architecture.sh` hook |
| 5 | Structural tests (architecture constraints) | `@architect` agent + `/harness-review` skill |
| 6 | Structured logging enforcement | `lint-structured-log.sh` hook |
| 7 | Naming convention enforcement | `lint-naming.sh` hook |
| 8 | File size limit enforcement | `lint-file-size.sh` hook |
| 9 | Lint error messages as agent remediation | All scripts write remediation to stderr |
| 10 | Knowledge base linters (up-to-date, cross-linked) | `validate-docs.sh` script |
| 11 | Doc-gardening agent | `@gardener` agent |
| 12 | Quality grading per domain | `grade-quality.sh` + `/harness-quality` skill |
| 13 | Execution plans as first-class artifacts | `docs/exec-plans/` + `/harness-plan` skill |
| 14 | Tech debt tracker | `docs/exec-plans/tech-debt-tracker.md` template |
| 15 | Parse at boundaries enforcement | `lint-boundaries.sh` hook |
| 16 | Agent-to-agent review loop (Ralph Wiggum Loop) | `/harness-loop` skill |
| 17 | Recurring garbage collection | `/harness-gc` skill |
| 18 | Progressive disclosure | CLAUDE.md → ARCHITECTURE.md → domain docs → design docs |
| 19 | Generated docs (db-schema, etc.) | `docs/generated/` directory |
| 20 | Agent legibility optimization | All templates structured for Claude's reasoning |

## The 10 Principles

1. **CLAUDE.md is a table of contents** — ~100 lines, pointers to docs
2. **Progressive disclosure** — start small, discover depth as needed
3. **Repository is the system of record** — if it's not in the repo, it doesn't exist
4. **Agent legibility over human aesthetics** — optimize for Claude's reasoning
5. **Enforce architecture mechanically** — rules in code, not prose
6. **Garbage collection** — continuous quality enforcement
7. **Golden principles in code** — taste captured once, enforced everywhere
8. **Increasing autonomy** — each capability unlocks the next
9. **Parse at boundaries** — validate external data at entry, trust internally
10. **Give a map, not a manual** — small map pointing to deeper sources

## Works With

Any project under 1M lines of code. Detects and adapts to:

- **Languages**: TypeScript, JavaScript, Python, Rust, Go, Java, Ruby, PHP, Swift, Kotlin, C#
- **Frameworks**: Next.js, React, Vue, Angular, Svelte, Express, Fastify, NestJS, Django, Flask, FastAPI, Rails, Spring, Gin, Actix, Laravel
- **Package managers**: npm, pnpm, yarn, bun, pip, poetry, uv, cargo, go, maven, gradle, bundler, composer

## License

MIT
