---
description: Generate bands.yaml + detection script — metric breach closes back into intent/
outputs: ["bands.yaml","scripts/detect-bands.*","docs/BANDS.md"]
effort: high
---

# Task: Generate the metric band detection loop

**Output:**
- `{{PROJECT_DIR}}/bands.yaml`
- `{{PROJECT_DIR}}/scripts/detect-bands.{{py|sh|ts — match the project}}`
- `{{PROJECT_DIR}}/docs/BANDS.md`

You are closing the loop. Maintenance is normally reactive: alerts get missed, tickets sit, and post-mortem actions lose to the next quarter's roadmap. This makes a metric breach *start* work automatically — detection fires, Claude diagnoses, and the finding lands as an `intent/` file in the triage queue, which is where the chain began.

**Detection is deterministic and contains no AI.** A script queries the metric store, applies fixed statistical rules, and decides whether a band was breached. It is version controlled and unit tested like any other code. Claude runs only *after* a breach, to diagnose — because a detector you cannot reason about produces alerts nobody trusts, and an untrusted alert is worse than none.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
2. "Launch the Explore agent to find what metrics this project can actually query today (see prompt below)"
3. "Read docs/OBSERVABILITY.md and docs/RELIABILITY.md if present — do not invent a metric store this project does not have"
4. "Read intent/README.md for the intent file format the detector's output must produce"
5. "Pick one to three metrics with a stable baseline. Fewer is better; a loop nobody trusts on one metric is worse than no loop"
6. "Write bands.yaml with the tiers"
7. "Write scripts/detect-bands.* — deterministic, no AI, with a unit test"
8. "Write docs/BANDS.md explaining the loop, the triage duty, and how dismissals tune the bands"
9. "Verify the script runs against the real metric source, or says clearly that the source is not wired up yet"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Explore Agent Prompt (Task 2)

```
Agent(subagent_type: "Explore", prompt: "Find every metric this project could actually query on a schedule today:
1. Metrics stores or monitoring — Prometheus, Datadog, CloudWatch, Grafana, Sentry: config, endpoints, and what is already exported
2. CI-derived metrics available from the CI provider's API — build failure rate, duration, flaky test counts, queue time
3. Git-derived metrics computable with no external service — PR cycle time, revert rate, change frequency per path
4. Application error channels — error tracking DSNs, log aggregation, alert routes
5. Any existing alerting rules or thresholds, and who they page
6. Whether a scheduled job already exists that could host this (cron workflow, scheduled pipeline)
For each: how it is queried (exact endpoint or command), what auth it needs, and whether it has enough history for a baseline.")
```

## Choosing metrics

A metric qualifies when it has a **stable baseline** and a breach means something actionable. Good candidates, in order of how little infrastructure they need:

- **Test failure rate on the default branch** — computable from CI history alone.
- **PR cycle time** — computable from git and the forge API alone.
- **Post-deploy error rate** — needs an error channel, but it is the one that matters most.

Do not instrument a new metric to make this task produce output. If step 2 found nothing queryable, write `docs/BANDS.md` saying what would need to exist, generate `bands.yaml` with the tiers documented, and leave the detector unwired with a clear note. That is an honest result.

## bands.yaml

```yaml
# Response tiers for metric breaches. Deliberately conservative: the agent's
# authority increases with the severity of the deviation, and stops well short
# of acting on production.
metrics:
  - name: {{metric}}
    source: {{exact query or command}}
    baseline:
      window: {{e.g. 30d}}
      method: rolling_mean_stddev
    bands:
      - sigma: 1
        action: log
      - sigma: 2
        action: diagnose          # Claude, read-only, writes intent/
      - sigma: 3
        action: propose           # Claude may open a PR or run a pre-approved runbook
        runbooks: [{{only pre-approved names, or []}}]
```

The tiers are the governance. 1σ is noise you want recorded, not acted on. 2σ earns a read-only diagnosis. 3σ earns a proposal that still goes through PR review. Nothing in this file authorizes an unreviewed production change.

## The detection script

Deterministic. Given a metric and its history: compute the rolling mean and standard deviation over the window, then apply fixed control rules — a single point beyond 3σ, two of three consecutive points beyond 2σ, and a run of eight consecutive points on one side of the mean. The last one is what catches a slow drift that never trips a threshold.

Requirements:

- No model call anywhere in it.
- Exits 0 when nothing breached; prints a machine-readable breach record otherwise.
- Handles too-little-history by refusing to judge rather than by guessing.
- Ships with a unit test feeding it a known series and asserting the breaches.

Write it in the project's own language so it lives with the rest of the code and gets maintained.

## What a breach produces

An `intent/` file in the format `intent/README.md` defines — the loop closes by re-entering at Stage 1, not by opening a special-purpose alert artifact:

- **Problem**: the metric, the band, the observed value against the baseline, the window.
- **Proposed outcome**: what should be true again.
- **Affected users and systems**: from the diagnosis.
- **Constraints**: unchanged from whatever the service already commits to.
- **Open questions**: what the read-only diagnosis could not settle.

It enters the triage queue as `status: draft`. A human decides: fix now, schedule, or dismiss — and **a dismissal tunes the band**, which is the only thing that keeps the loop from becoming noise. `docs/BANDS.md` must say that explicitly.

## docs/BANDS.md

Cover: which metrics are watched and why those; what each tier authorizes; who holds triage duty; that dismissals tune bands and how to make that edit; and the rule that when a fix ships, it gets an eval so the same regression cannot return silently.

## Rules

- No AI in detection. If the script calls a model, it is wrong.
- One to three metrics. A loop watching ten things produces noise before it produces trust.
- `runbooks` lists only pre-approved names, or is empty. Never generate an open-ended remediation capability.
- The detector must ship with a unit test over a known series. It is the one piece here whose silent failure means nothing ever fires again.
- Never authorize a production change without review at any tier.
- If nothing is queryable, say so plainly rather than wiring a detector against a metric store that does not exist.
