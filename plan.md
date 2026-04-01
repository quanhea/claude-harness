# claude-harness — Implementation Plan (v2)

> A Claude Code plugin that scaffolds any project (< 1M LOC) for agent-first
> development — applying every principle from OpenAI's "Harness Engineering" article.

## Philosophy

**No runtime. No build step. Just markdown and Claude Code.**

```
claude plugin install claude-harness     # or: claude --plugin-dir ./claude-harness
/setup-harness                           # one command, full scaffold
```

The plugin is a collection of **skills, agents, templates, and references** — all markdown.
When a user runs `/setup-harness`, Claude Code reads the templates, analyzes the user's
project using its built-in tools, and generates a customized scaffold. No npm, no TypeScript,
no compilation. Claude does the work.

## Core Principles (from article, strictly followed)

1. **CLAUDE.md as table of contents** — ~100 lines, pointers to `docs/`, never an encyclopedia
2. **Progressive disclosure** — agents start with small entry point, discover depth as needed
3. **Repository is the system of record** — if it's not in the repo, it doesn't exist
4. **Agent legibility > human aesthetics** — optimize for Claude's reasoning
5. **Enforce architecture mechanically** — rules, linters, structural tests, not prose
6. **Garbage collection** — continuous quality enforcement via recurring agent tasks
7. **Golden principles in code** — taste captured once, enforced everywhere
8. **Increasing autonomy** — each capability unlocked enables the next
9. **Parse at boundaries** — validate external data at entry, trust internally
10. **Give a map, not a manual** — small stable context pointing to deeper sources

## Plugin Structure

```
claude-harness/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── setup-harness/               # /setup-harness — the main one-liner
│   │   ├── SKILL.md                 # Instructions for Claude to generate scaffold
│   │   ├── templates/
│   │   │   ├── CLAUDE.md.md         # Table-of-contents CLAUDE.md template
│   │   │   ├── ARCHITECTURE.md.md   # Architecture map template
│   │   │   ├── settings.json.md     # Settings template with variants
│   │   │   ├── docs-structure.md    # docs/ directory layout + content templates
│   │   │   ├── rules.md             # .claude/rules/ templates
│   │   │   ├── skills.md            # Project-embedded skills templates
│   │   │   └── agents.md            # Project-embedded agent templates
│   │   └── references/
│   │       └── harness-principles.md # The 10 principles, deeply explained
│   ├── harness-sync/                # /harness-sync — update stale docs
│   │   └── SKILL.md
│   ├── harness-review/              # /harness-review — architecture-aware review
│   │   └── SKILL.md
│   ├── harness-plan/                # /harness-plan — create execution plan
│   │   └── SKILL.md
│   ├── harness-quality/             # /harness-quality — grade domains
│   │   └── SKILL.md
│   └── harness-learn/               # /harness-learn — generate skills from history
│       ├── SKILL.md
│       └── references/
│           └── pattern-catalog.md   # Common workflow patterns to detect
├── agents/
│   ├── reviewer.md                  # Code review agent
│   ├── architect.md                 # Architecture analysis agent
│   └── gardener.md                  # Doc-gardening agent
└── README.md
```

## What `/setup-harness` Generates

When a user runs `/setup-harness`, Claude Code:

1. **Detects** — Uses shell injection (`!`backtick`) to detect language, framework,
   package manager, project structure before the prompt reaches Claude
2. **Reads templates** — From the plugin's `templates/` directory
3. **Adapts** — Customizes each template based on real project context
4. **Writes** — Creates the full scaffold in the user's repo

Generated output in the user's project:

```
project/
├── .claude/
│   ├── CLAUDE.md              # Table of contents (~100 lines)
│   ├── settings.json          # Permissions, allowed tools
│   ├── rules/
│   │   ├── architecture.md    # Module boundaries, dependency direction
│   │   ├── testing.md         # Test conventions (path-scoped to *.test.*)
│   │   └── documentation.md   # Doc maintenance rules
│   ├── skills/
│   │   ├── sync/SKILL.md      # Re-analyze and update docs
│   │   ├── review/SKILL.md    # Architecture-aware code review
│   │   ├── plan/SKILL.md      # Create execution plan
│   │   └── quality/SKILL.md   # Grade quality per domain
│   └── agents/
│       ├── reviewer.md        # Code review agent
│       ├── architect.md       # Architecture analysis agent
│       └── gardener.md        # Doc-gardening agent
├── docs/
│   ├── ARCHITECTURE.md        # Architecture map
│   ├── QUALITY.md             # Quality grades per domain
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
│       └── index.md
└── .gitignore                 # Updated with .claude/settings.local.json
```

## Execution Order

1. Write plan.md (this file)
2. Create plugin scaffold (plugin.json, directories)
3. Write harness-principles.md reference (the source of truth for all templates)
4. Write all templates in setup-harness/templates/
5. Write setup-harness SKILL.md (the main orchestrator)
6. Write maintenance skills (sync, review, plan, quality, learn)
7. Write agent definitions
8. Write README.md
9. Test with `claude --plugin-dir .`
