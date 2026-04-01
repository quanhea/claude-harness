# claude-harness

A Claude Code plugin that scaffolds any project for agent-first development.

One command. Full scaffold. No build step.

```
/setup-harness
```

## What It Does

Applies the [Harness Engineering](https://openai.com/index/harness-engineering/) methodology to your project:

- **CLAUDE.md as table of contents** (~100 lines) pointing to deeper docs
- **`docs/` as system of record** — architecture, quality grades, design docs, exec plans
- **Rules enforced mechanically** — architecture boundaries, testing conventions, doc maintenance
- **Project-embedded skills** — `/sync`, `/review`, `/plan`, `/quality`
- **Specialized agents** — `@reviewer`, `@architect`, `@gardener`
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
├── design-docs/           # Design decisions
├── exec-plans/            # Active + completed plans
├── product-specs/         # Product specs
├── references/            # External reference material
└── encyclopedia/          # Auto-generated codebase knowledge
```

### Ongoing Maintenance

| Command | What it does |
|---------|-------------|
| `/harness-sync` | Re-analyze and update stale docs |
| `/harness-review` | Architecture-aware code review |
| `/harness-plan <task>` | Create structured execution plan |
| `/harness-quality` | Grade quality per domain |
| `/harness-learn` | Generate skills from conversation history |

### Agents

| Agent | When to use |
|-------|-------------|
| `@reviewer` | Delegate code review |
| `@architect` | Analyze architecture health |
| `@gardener` | Find stale docs and quality drift |

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

## What Gets Generated vs What's in the Plugin

**Plugin provides** (installed once, used across projects):
- `/setup-harness` — the generator skill
- `/harness-sync`, `/harness-review`, `/harness-plan`, `/harness-quality`, `/harness-learn` — maintenance skills
- `@reviewer`, `@architect`, `@gardener` — specialized agents
- Templates and references

**Generated into your project** (committed to your repo):
- `.claude/CLAUDE.md` — customized for YOUR project
- `.claude/settings.json` — permissions for YOUR stack
- `.claude/rules/` — rules adapted to YOUR language
- `.claude/skills/` — skills with YOUR build/test commands
- `.claude/agents/` — agents configured for YOUR project
- `docs/` — knowledge base for YOUR codebase

## Works With

Any project under 1M lines of code. Detects and adapts to:

- **Languages**: TypeScript, JavaScript, Python, Rust, Go, Java, Ruby, PHP, Swift, Kotlin, C#
- **Frameworks**: Next.js, React, Vue, Angular, Svelte, Express, Fastify, NestJS, Django, Flask, FastAPI, Rails, Spring, Gin, Actix, Laravel
- **Package managers**: npm, pnpm, yarn, bun, pip, poetry, uv, cargo, go, maven, gradle, bundler, composer

## License

MIT
