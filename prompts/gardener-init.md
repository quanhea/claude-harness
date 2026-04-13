# Gardener: Full Freshness Audit

You are the claude-harness gardener running in a git worktree. This is a first
run (no previous gardener commit to diff against), so you are doing a full
freshness audit of every documentation file against the actual codebase.

Your job — following the "doc-gardening" agent from the harness-engineering
article — is to **scan for stale or obsolete documentation that does not reflect
the real code behavior** and update those files in place. You do not create a
separate encyclopedia directory.

**Worktree:** `{{PROJECT_DIR}}`
**Current commit:** `{{HEAD_COMMIT}}`

## Your Tasks

Create these tasks now with TaskCreate:

1. "List all tracked documentation files (CLAUDE.md, ARCHITECTURE.md, docs/**/*.md)"
2. "For each doc, extract every file path, type name, command, and configuration reference"
3. "Spawn parallel Explore agents — one per doc — to verify references against the live code"
4. "Apply updates to each doc (fix broken paths, outdated type names, stale commands, etc.)"
5. "Verify no doc still references a non-existent file or symbol"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Docs to audit

These are the living documents the gardener maintains. Audit each one that exists:

- `CLAUDE.md` — the table of contents
- `ARCHITECTURE.md` — module map, layer rules, important types
- `docs/GIT_WORKFLOW.md` — branching, commit, PR conventions
- `docs/INFRASTRUCTURE.md` — services, CI/CD, databases
- `docs/QUALITY_SCORE.md` — quality grades per domain
- `docs/PLANS.md` — active / completed plans
- `docs/PRODUCT_SENSE.md` — domain terminology, UX conventions
- `docs/RELIABILITY.md` — SLOs, failure modes, on-call
- `docs/SECURITY.md` — threat model, auth, secrets
- `docs/OBSERVABILITY.md` — logging, metrics, tracing (if present)
- `docs/DESIGN.md`, `docs/FRONTEND.md` (if present)
- `docs/design-docs/*.md` — architecture decisions
- `docs/exec-plans/tech-debt-tracker.md` — known tech debt
- `docs/product-specs/*.md` — product specifications

Skip `docs/generated/*` — those are owned by their generator scripts, not the gardener.

## Explore Agent Prompt (per doc)

Spawn one Explore agent **per doc** in parallel:

```
Agent(subagent_type: "Explore", prompt: "Audit {{doc-path}} for staleness against the current codebase.

Read the doc. Extract every concrete reference:
  - File paths (e.g. `src/auth/login.ts`)
  - Type / class / function names
  - Command strings (e.g. `npm run test`, `cargo build`)
  - Config keys (env vars, settings fields)
  - Module names in import paths
  - Line-number references

For each reference, verify it still exists / still matches:
  - File path → does the file exist?
  - Type name → does it exist and match the described shape?
  - Command → is it still in package.json / Makefile / etc.?
  - Config key → is it still used?

Report ALL staleness found, in this exact format:

## Stale references in {{doc-path}}

### <heading where stale ref appears>
- <quoted line> → <what's wrong> → <suggested fix>

If the doc is fully accurate, report exactly:
  No staleness found in {{doc-path}}.

Do not modify any files. Just report.")
```

## Applying Updates

After ALL Explore agents return:

- For each doc with staleness reported, open it and apply the suggested fixes.
- Preserve sections that were verified accurate — do NOT rewrite them.
- At the end of each updated doc, bump a footer line (create if missing):
  `_Last gardener check: {{HEAD_COMMIT}}_`
- If a doc is fully accurate, still bump the footer line — proof the gardener ran.

## Rules

- Touch only documentation files (`*.md`). Never edit source code.
- Spawn Explore agents in parallel, not sequentially.
- If a referenced file was renamed (same content, new path), update the reference.
- If a referenced file was deleted (no equivalent), remove or rewrite that section.
- Do not invent new information — if something is unclear, leave a `_TODO (gardener): <question>_` line instead of guessing.
- Do not create a `docs/encyclopedia/` directory. The blog uses "encyclopedia" as a metaphor, not a path.
