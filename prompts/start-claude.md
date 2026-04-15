---
description: Initialize a claude session with harness-engineering methodology context
---

You are starting a session to help set up `{{PROJECT_DIR}}` for **agent-first development**.

---

## The shift

Building software with AI agents is not about writing prompts instead of code. It is about redesigning the *environment* so agents can do reliable work at scale.

The most important insight: from the agent's point of view, anything it cannot access in-context while running effectively does not exist. Knowledge that lives in Slack threads, design docs, or people's heads is invisible to the system. Repository-local, versioned artifacts are all the agent can see.

This makes the repository the single system of record — not documentation tooling, not wikis, not shared drives. The repository itself.

---

## What agent-legible looks like

**CLAUDE.md is a table of contents, not an encyclopedia.**

Roughly 100 lines. Injected into every agent session. It maps the territory — one sentence per concern, pointers to where agents should look for deeper truth. A monolithic instruction file fails in three predictable ways: it crowds out task context, it rots the moment the codebase evolves, and it cannot be mechanically verified. The fix is not a better monolith. It is a short, stable entry point and a structured knowledge store behind it.

**The repository's knowledge base lives in `docs/`.**

Architecture, design decisions, operating principles, quality grades — all versioned, all co-located with the code. Agents navigate from the table of contents into this store rather than relying on ad-hoc instructions. What the team aligned on in a meeting? If it isn't discoverable in the repo, it doesn't exist for the agent — and it effectively doesn't exist for a new engineer joining three months later either.

**Plans are first-class artifacts.**

Small changes use lightweight ephemeral plans. Complex work is captured in execution plans checked into the repository, with progress logs and decision records. Active plans, completed plans, and known technical debt are versioned and co-located. Agents can always find where any task stands. This is how you translate human intent into something an agent can act on reliably across multiple sessions.

**Architecture is enforced mechanically, not by convention.**

Documentation alone does not keep an agent-generated codebase coherent. Structural linters and invariants — enforced in CI — define module boundaries, dependency directions, and permissible relationships. Agents are most effective in environments with strict, predictable structure. Encode the boundaries; allow full autonomy within them.

**Taste is captured once and enforced everywhere.**

Review comments, refactoring decisions, and user-facing bugs all feed back into the repository as documentation updates or encoded tooling rules. A recurring "doc-gardening" process scans for stale documentation, outdated patterns, and quality drift — opening targeted fix-up pull requests on a regular cadence. Technical debt is like a high-interest loan: pay it down continuously in small increments rather than in painful bursts.

---

## The principles

1. **Shallow entry point, deep knowledge store.** CLAUDE.md maps the territory. `docs/` holds the territory. Agents start small and are taught exactly where to look next.

2. **If it isn't in the repo, it doesn't exist.** Encode every architectural decision, operating norm, and quality expectation the agent needs to be effective. External context is invisible context.

3. **Enforce boundaries mechanically, allow autonomy locally.** Care deeply about correctness invariants and module boundaries. Within those boundaries, let agents express solutions freely.

4. **Plans compound value.** An agent working from a detailed execution plan with progress logs produces far better output than one working from a vague description. Plans are reusable context.

5. **Quality is graded, not assumed.** Each product domain has an explicit quality grade that tracks gaps over time. This keeps the knowledge base honest and tells agents where to be careful.

---

## Your role in this session

Read the project at `{{PROJECT_DIR}}`. Understand its language, framework, architecture, conventions, and domain.

Then generate the markdown files that make this project agent-legible — writing them directly into the project:

- **`CLAUDE.md`** — the table of contents. ~100 lines. One sentence per concern. Key commands, architecture overview, what to read first, where to find plans, rules, and domain docs. Must be a map, not a manual.
- **`ARCHITECTURE.md`** — the module map. Top-level domains, data flow, layer boundaries, key invariants. The navigation aid agents use to understand the system without reading all the code.
- **`PLANS.md`** — the norms and current state of execution plans. What an active plan looks like, how to update it, where to find completed ones. Agents need this to participate in ongoing work without losing thread.
- **`docs/QUALITY_SCORE.md`** — quality grades by domain. What is solid, what is fragile, what has known gaps. Honest assessment beats optimism.
- **`docs/CORE_BELIEFS.md`** — the operating principles specific to this project. What the team values in architecture, testing, product decisions, and code style. Opinionated, mechanical, real.
- **`.claude/rules/`** — rule files that load on every session: architecture invariants, testing requirements, documentation norms, git workflow. Short, specific, enforceable.

Generate files that reflect the real project, not boilerplate. Read the actual code before writing.
