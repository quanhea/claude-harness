---
description: Generate docs/SDLC.md — the artifact chain and where each stage's record lives
outputs: ["docs/SDLC.md"]
---

# Task: Generate docs/SDLC.md

**Output:** `{{PROJECT_DIR}}/docs/SDLC.md`

You are creating `docs/SDLC.md` — the map of how work moves through this repo, from an idea to a shipped change to the incident that starts the next one.

The idea it encodes: **every stage ends by committing an artifact**, so the chain of commits is the audit trail — who asked for what, what the agent produced, and who approved it. Work is not tracked by where a ticket sits on a board; it is tracked by which artifacts exist and who signed them off.

This file is the index of that chain. It does not restate the other docs — it says which artifact each stage produces, who owns the decision to advance, and where the record lives when this project also has a ticket tracker.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
2. "Detect which issue tracker this project actually uses — check for `.github/ISSUE_TEMPLATE/`, PR/commit message conventions referencing ticket ids (JIRA-123, ENG-456, #123), CI config, CODEOWNERS, and any MCP server configured in `.mcp.json`"
3. "Detect which chain artifacts already exist (`intent/`, `docs/specs/`, `docs/exec-plans/`, `REVIEW.md`, `evals/`) so the map describes reality, not the full template"
4. "Decide the source-of-truth configuration from what step 2 found (see below) and record the reasoning"
5. "Write docs/SDLC.md following the template"
6. "Verify every path named in the file either exists or is marked as not yet adopted"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Choosing the source-of-truth configuration

Existing trackers are hard to displace — auditors accept them and other teams depend on them — so this chain has to fit around what already exists. Pick one of three and say which in the file:

**Repo as the source of truth.** The Markdown artifacts are authoritative; tracker records reference the file or commit. Choose this when step 2 found no tracker, or only a lightly used one, and the team is engineering-led.

**The tracker is the source of truth.** The tracker holds the authoritative record; the Markdown artifacts are working copies. Claude reads the record at session start and writes outcomes back through an MCP connector. Choose this when step 2 found a tracker referenced in most commit messages or PR titles, especially one with compliance weight.

**Linkage as the minimum bar.** Every artifact notes the tracker record id; every tracker record notes the commit SHA of the artifact. Neither is subordinate. Choose this when a tracker is in real use but the team has not decided, and say plainly that it is a transitional posture.

Do not invent a tracker the project does not use, and do not propose migrating off one. If evidence is thin, choose repo-as-truth and say the evidence was thin.

## Template

```markdown
# How work moves through this repo

Updated: {{today's date}}

Every stage ends by committing an artifact. The chain of commits is the record:
who asked for what, what was produced, and who approved it. If an artifact does
not exist, that stage has not happened yet.

## The chain

| Stage | Artifact | Who decides it advances |
|-------|----------|-------------------------|
| Plan | `intent/<slug>.md` | {{product owner / originator's lead — from CODEOWNERS if present}} |
| Design | `docs/specs/<slug>.md` | {{same, consulting policy owners on flagged concerns}} |
| Build | `docs/exec-plans/active/<slug>.md` | {{engineer; tech lead for higher-risk changes}} |
| Build | the diff, with tests | {{engineer — verified per docs/VERIFY.md}} |
| Deploy | the PR, with review findings | {{human code owner — see REVIEW.md}} |
| Maintain | an incident record, then a new `intent/` entry | {{service owner}} |

Each row's artifact names the one before it, so any change can be read backwards
from the diff to the sentence that asked for it.

## Source of truth

{{One of the three configurations, named and explained in two or three sentences,
including how a tracker id and a commit SHA reference each other in practice here.}}

## What each stage owes the next one

- **Intent** states the problem in the originator's own words — what is wanted,
  why, under which constraints. It is not a solution. See `intent/README.md`.
- **Spec** turns intent into a design that conforms to this project's standards,
  and flags anywhere those standards conflict. See `docs/specs/README.md`.
- **Plan** names the files that change, the order of work, the risks, and the
  proof. Written before code, in plan mode. See `docs/PLANS.md`.
- **Diff** carries its own verification. See `docs/VERIFY.md`.
- **PR** carries review findings by severity. See `REVIEW.md`.
- **Incident** comes back in as a new intent, so the loop closes rather than
  ending in a post-mortem nobody actions.

## What is not adopted yet

{{List the chain stages this project has not set up, with one line each on what
adopting it would take. An honest gap list is more useful than a template that
describes a process nobody follows.}}

## Small changes

A one-line fix does not need the full chain. The rule is the same as for plans:
anything that spans more than one commit, or that someone other than the author
will need to understand later, gets its artifacts. Everything else goes straight
to a verified diff.
```

## Rules

- Name real owners where CODEOWNERS or the tracker gives you one; write `{{role}}` as a placeholder only when the project genuinely has no answer, and say so.
- The "What is not adopted yet" section is required and must be honest. A project that has only `docs/exec-plans/` lists the other five stages there.
- Do not restate the content of `docs/VERIFY.md`, `docs/PLANS.md`, or `REVIEW.md`. This file points at them.
- Keep it under 80 lines. It is a map.
