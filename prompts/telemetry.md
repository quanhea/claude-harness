---
description: Generate docs/TELEMETRY.md — OpenTelemetry export for agent activity
outputs: ["docs/TELEMETRY.md"]
---

# Task: Generate docs/TELEMETRY.md

**Output:** `{{PROJECT_DIR}}/docs/TELEMETRY.md`

You are documenting how this project measures its own agent-assisted development — the metrics the other plays claim, and where the numbers actually come from.

Every stage of this workflow has a leading and a lagging indicator, and almost all of them are unmeasurable by default. This file is what makes the claims checkable: concurrent sessions per engineer, time waiting at approval gates, first-pass CI success rate, time from breach to triage. Without it, "the harness is working" is a feeling.

Note what this is **not**: `docs/OBSERVABILITY.md` covers the application in production. This covers the development loop. They use similar tooling and answer entirely different questions, and conflating them produces a document that serves neither.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
2. "Read docs/OBSERVABILITY.md if present — reuse its collector and backend rather than proposing a second stack, and say plainly that the two docs have different scopes"
3. "Detect what already exists: an OTel collector config, a metrics backend, a CI provider whose API exposes build data, and the forge API for PR data"
4. "Determine which of this project's harness claims are measurable today versus which need wiring"
5. "Write docs/TELEMETRY.md following the template"
6. "Verify no metric is listed as available when nothing emits it"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Template

```markdown
# Development telemetry

Updated: {{today's date}}

What we measure about how work gets built here, and where each number comes
from. For production application monitoring, see `docs/OBSERVABILITY.md` —
different question, similar tooling.

## Why

Every practice in `docs/SDLC.md` claims an effect. This file is how those
claims get checked, and how a practice that has stopped paying for itself
becomes visible instead of becoming habit.

## Sources

| Source | What it gives | Status |
|--------|---------------|--------|
| Claude Code OpenTelemetry export | Session counts, duration, tool use, token spend, per-engineer attribution | {{configured / not configured}} |
| {{CI provider}} API | Build outcomes, duration, first-pass success, flaky rate | {{status}} |
| {{Forge}} API + git history | PR cycle time, review latency, rework, revert rate | {{status}} |
| {{Metrics backend if present}} | Where the above land and how they are queried | {{status}} |

## Enabling the Claude Code export

{{The concrete steps for this project: the environment variables that turn on
the OTel export, the collector endpoint to point at, and where those settings
live so every engineer gets them — repo settings, managed settings, or a
documented shell profile entry. If no collector exists, say what standing one
up would take and stop there rather than inventing an endpoint.}}

Attribution matters here: each run is attributed to the engineer who started
it, which is what lets agent activity be measured without the numbers becoming
anonymous aggregate noise.

## What we track

| Question | Metric | Source | Today |
|----------|--------|--------|-------|
| Are changes right the first time? | First-pass CI success rate on agent-written changes | {{CI API}} | {{value or "not measured"}} |
| Where does time actually go? | Time from plan approval to merged PR | {{forge API}} | {{...}} |
| Are approval gates a bottleneck? | Wait time per gate, with decision and timestamp | OTel export | {{...}} |
| Is review keeping up? | Time to first review; share of findings resolved without a human touching the branch | {{forge API}} | {{...}} |
| Is the loop closing? | Time from band breach to triage queue; share of findings that become merged PRs | {{detector logs}} | {{...}} |
| Is it costing what we think? | Token spend per merged change | OTel export | {{...}} |

## What we deliberately do not track

Individual output counts — lines, commits, or sessions per person — as a
performance measure. They are trivially gamed, they punish the person who
picked the hard problem, and the moment they are used that way every other
number here becomes unreliable too.

## Reviewing this

{{Who looks at these and how often.}} A metric nobody reads is cost without
information — delete it rather than letting the table grow.
```

## Rules

- Mark a metric available only if something emits it today. Everything else says "not measured" with one line on what it would take. An aspirational dashboard is how a telemetry doc becomes fiction.
- Do not propose a second observability stack. If `docs/OBSERVABILITY.md` names a collector and backend, reuse them and say so.
- Never write concrete credentials or endpoints containing secrets. Name the variable, not the value.
- The "what we deliberately do not track" section is required. Telemetry about how people work is exactly the kind that gets repurposed, and writing the boundary down is cheap now and expensive later.
- If the project has no CI and no metrics backend, this file is short and honest: name the two or three things computable from git history alone, and stop.
