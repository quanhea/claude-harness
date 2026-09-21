---
description: Generate docs/VERIFY.md (change-type → verification matrix)
outputs: ["docs/VERIFY.md"]
---

# Task: Generate docs/VERIFY.md

**Output:** `{{PROJECT_DIR}}/docs/VERIFY.md`

You are creating `docs/VERIFY.md` — the gate a change passes before anyone calls it done.

The problem this file solves: "I ran the tests" means something different for a migration than for a CSS change, and an agent with no guidance reaches for the cheapest check that produces a green line. This file removes the choice. It classifies a change by what it touches, then names the specific commands and observations that settle it.

A verification matrix is only worth writing if its rows are real. Every command in it must be one you found in this project and could run today.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Launch the Explore agent to enumerate this project's verifiable surfaces (see prompt below)"
3. "Read ARCHITECTURE.md to learn the module/service boundaries the matrix rows should follow"
4. "Read docs/INFRASTRUCTURE.md (if present) for how to bring dependencies up locally"
5. "Determine the change types — one row per surface that has a genuinely different check"
6. "For each type, record the exact commands, with the flags this project actually uses"
7. "Write docs/VERIFY.md following the template"
8. "Verify every command in the file appears somewhere real — a script, a manifest, a CI config, or a README"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Explore Agent Prompt (Task 2)

```
Agent(subagent_type: "Explore", prompt: "Find every way this project's correctness can be checked:
1. Test commands — per package/crate/module, including any non-default runner (nextest, vitest, pytest markers)
2. Test lanes that differ in fidelity (unit vs integration vs e2e vs device/browser lanes) and any known false-green lane
3. Lint, typecheck, and format commands, and whether CI treats warnings as errors
4. Build commands, and what a build proves vs. does not prove here
5. How to run the app locally — every service that must be up first, and on what ports
6. Database/migration verification — how migrations are applied and how a schema change is confirmed
7. Any browser/device automation already used (Playwright, Cypress, Appium, XCUITest) and how it is invoked
8. Any existing verification checklist, QA doc, definition-of-done, or PR template
9. What CI runs on a PR, in order — this is the floor a local check should clear
Report exact commands with file paths and the directory each must run from.")
```

## Template

```markdown
# Verification

Updated: {{today's date}}

Every change ships with verification. Do not report a task complete until the checks for the *type* of change have run and passed.

## Classify the change first

| The change touches… | Type | Verify with |
|---------------------|------|-------------|
| {{surface, e.g. "core library / engine code"}} | **{{Type}}** | {{exact commands}} |
| {{surface, e.g. "HTTP handlers, services, migrations"}} | **{{Type}}** | {{exact commands}} |
| {{surface, e.g. "anything a user can perceive in the UI"}} | **{{Type}}** | {{exact commands}} |
| {{surface, e.g. "Dockerfiles, CI config, deploy manifests"}} | **Infra** | {{exact commands}} |
| Markdown only | **Docs** | Re-read the diff; confirm links resolve; run any doc examples |

If a change spans types, run verification for *each* type — not just the cheapest one.

## {{Type 1}}

{{Per-type detail: which lane is ground truth, which flags matter, what a failure here usually means. Include any lane that false-greens and what to use instead.}}

## {{Type 2}}

{{...}}

## Evidence standard

{{FILLED BY THE `evidence-standard` SECTION BELOW — see the prompt's instructions}}

## What does NOT count as verification

- A passing typecheck or build — proves it compiles, not that it behaves.
- "The diff looks right" — read it, then *exercise* it.
- Running only the tests you just added — regressions live elsewhere; run the surrounding suite.
- A log line saying an action succeeded — re-read the resulting state instead.
{{any project-specific false-green found by Explore, e.g. a test lane that passes outside the real sandbox}}

## When you cannot verify

Say so explicitly in the completion report — name what you could not check and why. Never silently skip verification. An unverified change is not done.
```

## The `evidence-standard` section

Fill the **Evidence standard** heading with what this project accepts as proof a change worked, by change type. This is the section that decides whether "done" is a claim or an artifact, so it is worth getting specific:

- For changes with no user-visible surface, the passing command output is usually the evidence, and the standard is just *which* output and where it goes.
- For user-perceivable changes, decide what the team keeps: nothing beyond the run itself, a still screenshot of the post-change state, or a recording of the golden path. A recording costs a minute and is the only artifact that survives the session — but it is only worth mandating if the project has a browser/device automation lane to produce it (check what Explore found in step 7).
- Whatever you choose, say where the artifact is stored and whether it is attached to the PR.

Write it as prose plus a short table. Do not mandate an artifact the project has no tooling to produce.

## Rules

- One row per surface that has a *genuinely different* check. Two rows with the same command are one row.
- Every command must include the directory it runs from when that isn't the repo root.
- Name the false-green lanes explicitly — a verification doc that omits the lane people wrongly trust has failed at its one job.
- No aspirational rows. If the project has no browser lane, the UI row says how UI changes are checked today, even if the answer is "by hand, and this is a gap".
- If the project already has a QA checklist or definition-of-done, build on it rather than replacing it.
