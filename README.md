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
├── QUALITY.md             # Quality grades per domain
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

These run automatically after every `Edit`/`Write` via PostToolUse hooks:

| Linter | Article Quote | What It Checks |
|--------|---------------|----------------|
| **lint-file-size** | "file size limits" | Source files > 300 lines |
| **lint-naming** | "naming conventions for schemas and types" | kebab-case file names |
| **lint-structured-log** | "we statically enforce structured logging" | No console.log/print |
| **lint-architecture** | "strictly validated dependency directions" | Import direction: Types→Config→Repo→Service→Runtime→UI |
| **lint-boundaries** | "parse data shapes at the boundary" | Unvalidated JSON.parse/json.loads |

Additional scripts (run by skills, not hooks):

| Script | What It Does |
|--------|-------------|
| **validate-docs** | Check knowledge base structure, cross-links, freshness |
| **grade-quality** | Automated quality metrics per domain (file count, test ratio, etc.) |

All linter error messages **inject remediation instructions into agent context** — exactly as described in the article: "we write the error messages to inject remediation instructions into agent context."

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
