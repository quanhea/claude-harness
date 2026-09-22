---
description: Generate docs/VERIFY.md — how to derive verification from the change itself
outputs: ["docs/VERIFY.md"]
max-turns: 200
effort: max
---

# Task: Generate docs/VERIFY.md

**Output:** `{{PROJECT_DIR}}/docs/VERIFY.md`

You are creating `docs/VERIFY.md` — the gate a change passes before anyone calls it done.

The problem it solves: an agent with no guidance reaches for the cheapest check that produces a green line. It runs the test suite for a change that claims to reduce memory, and the suite passes, and the memory is unchanged. The suite was never able to see the thing that was claimed.

So this file cannot be a list of commands. **A command list only covers the changes someone already thought of.** What it must teach is a derivation: given *this* change, what would be different in the world if it worked, and what instrument can read that difference. A matrix of change types is a useful shortcut on top of that method, never a replacement for it.

Done right, an agent facing a task nobody anticipated — a lock contention fix, a font-loading regression, a socket leak under retry — can still work out how to prove it.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
2. "Launch the Explore agent to inventory this project's verification instruments (see prompt below) — not just its test commands"
3. "Read ARCHITECTURE.md for the boundaries the matrix rows should follow, and docs/INFRASTRUCTURE.md for how to bring dependencies up locally"
4. "For each instrument class in the catalog below, record what this project has today, what it could get cheaply, and what it genuinely lacks — write this to `.claude-harness/instruments.md`"
5. "Determine the change types that have a genuinely different check, with the exact commands and the directory each runs from"
6. "Write docs/VERIFY.md: the derivation method first, then the matrix, then the instrument table, then the anti-patterns"
7. "Verify every command named in the file exists somewhere real — a script, a manifest, a CI config, or a README"
8. "Verify the file answers a change type NOT in its own matrix, by walking the method against one example you invent"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

**Gate check:** `.claude-harness/instruments.md` must exist before you write `docs/VERIFY.md`. Writing the doc first produces a list of the instruments you already had in mind.

## Explore Agent Prompt (Task 2)

```
Agent(subagent_type: "Explore", prompt: "Inventory every way this project can OBSERVE its own behavior — not only its test commands. For each, give the exact invocation and the directory it runs from.

TESTS AND LANES
1. Test commands per package/crate/module, including non-default runners (nextest, vitest, pytest markers)
2. Lanes that differ in fidelity (unit vs integration vs e2e vs device/browser) and any lane known to false-green
3. Property-based, snapshot/golden, fuzz, or differential testing already in use
4. Lint, typecheck, format commands; whether CI treats warnings as errors

RUNNING IT
5. How to run the app locally: every service that must be up first, and on what ports
6. Health endpoints, readiness probes, admin/debug endpoints, feature flags
7. Any seed/fixture/demo-data command

PERFORMANCE AND RESOURCES
8. Profilers available for this stack (CPU sampling, flame graphs, perf, Instruments, pprof, py-spy, clinic, async-profiler)
9. Memory tooling: heap snapshots/dumps, allocation tracking, leak detection, valgrind/ASan/heaptrack, GC logs
10. Benchmark harnesses (criterion, JMH, pytest-benchmark, hyperfine, k6, wrk, locust) and any committed baseline numbers
11. Resource inspection: fd/handle counts, thread/process counts, disk growth, container memory limits

CONCURRENCY AND FAILURE
12. Race/deadlock detection (-race, TSan, loom, deterministic schedulers) and stress/soak harnesses
13. Fault injection, chaos tooling, or any way to simulate a dependency being down, slow, or partitioned

DATA
14. How migrations are applied, whether they are reversible, and how a schema change is confirmed
15. Database access for assertions (psql/mysql/mongosh), and whether a scratch/ephemeral DB exists
16. Backup/restore procedures

NETWORK AND EXTERNAL
17. Request logging, proxies, packet capture, HTTP recorders (VCR/cassettes/MSW), mock servers
18. How outbound third-party calls are observed or intercepted

USER-FACING
19. Browser/device automation (Playwright, Cypress, Appium, XCUITest, Selenium) and how it is invoked
20. Screenshot/visual diff tooling; any recording capability; accessibility auditing (axe, Lighthouse)
21. For CLIs: golden-output tests, PTY harnesses, exit-code conventions

SECURITY AND SUPPLY CHAIN
22. SAST/DAST, dependency audit, secret scanning, license checks; SBOM generation; reproducible build support

OBSERVABILITY
23. Logging, metrics, tracing — how to read them locally, and whether a change's emitted signals can be inspected

CI
24. What CI runs on a PR, in order — this is the floor any local check should clear

For anything NOT present, say so explicitly. A missing instrument is a finding, not an omission.")
```

---

# Part 1 — The derivation method

This section goes into `docs/VERIFY.md` close to verbatim, adapted to the project's vocabulary. It is the most important part of the file, and it goes **first**, before any matrix — a reader who stops after the first screen should leave with the method, not with a table they will treat as exhaustive.

## The five steps

**1. State the claim.** One sentence, in terms of something observable from outside the code. "The checkout button now works" is not yet a claim. "A signed-in user with an expired card sees a decline message instead of a spinner that never resolves" is.

If the claim cannot be written without describing the implementation, the change has no externally visible effect — say so, and verify at the next layer out that does.

**2. Name the observable that would differ.** If the change works, what is measurably different? A returned value, a persisted row, a rendered pixel, an emitted event, a p99 latency, a heap residency after a thousand iterations, a file descriptor count, an absent log line. Be specific enough to point at a number or a state.

**3. Choose the instrument that reads that observable at its own layer.** This is the step the catalog below exists for. The rule: **the instrument must be able to see the claim fail.** A test suite cannot see a memory regression. A memory profiler cannot see a wrong discount calculation. Choosing the instrument you already have, rather than the one that can see the claim, is the single most common way verification becomes theatre.

**4. Establish the baseline, then measure the after.** For anything quantitative this is not optional — "180ms" means nothing without the before. Capture the baseline on the unchanged code, ideally by stashing the change, and record both numbers with the conditions they were taken under (machine, load, dataset size, warm or cold).

**5. Prove the link — the mutation check.** Undo the change and confirm the observation reverts. This is what separates "I observed a good number" from "this change produced it". For a test, revert the fix and watch the test fail. For a benchmark, re-run on the baseline. For a UI fix, confirm the old build still shows the bug.

A verification that passes both before and after the change proves nothing about the change. If you skip one step, do not skip this one.

## How much rigor

Scale effort to what a wrong answer costs. Two questions decide it: **how reversible** is the change, and **how far** does the blast radius reach.

| | Easily reverted | Hard to revert |
|---|---|---|
| **Contained** | Run the instrument once. Mutation check optional. | Instrument + mutation check. |
| **Wide** | Instrument + mutation check + one adjacent flow. | All of the above, plus the failure modes in the catalog's fault-injection row, plus a second pair of eyes. |

Data migrations, anything touching money or auth, and anything that changes stored state are hard-to-revert by default regardless of how small the diff looks.

## When the instrument does not exist

Say so, in these words: what you could not observe, why, and what would be needed. Then verify at the nearest layer that *is* observable and be explicit that it is a proxy.

Do not substitute a cheaper instrument silently. "Tests pass" under a claim about memory is a false statement about what was checked, and it is worse than "memory was not measured; no tooling in this project can" — because the second one is true and can be fixed.

---

# Part 2 — The instrument catalog

**This is a starting point, not a menu.** The classes below cover what comes up most; they do not cover everything, and they are not meant to. When a change's claim does not fit a row here, go back to the five steps and reason out the instrument from the observable. A project's most valuable verification is often one nobody wrote down.

For each class, put into `docs/VERIFY.md` only what this project actually has, with its real invocation, plus an honest note on what it lacks. Keep the class headings even where the project has nothing — an empty row is a visible gap; a deleted row is an invisible one.

### Behavior and correctness
Unit and integration tests; property-based tests for invariants that should hold across all inputs; golden/snapshot tests for structured output; differential or shadow testing against a reference implementation or the previous version; fuzzing for parsers and anything consuming untrusted input; contract tests against mocked externals; …

### User-perceivable behavior
Browser automation driving the real UI; device/mobile automation; a screenshot compared against the design; visual diff against a stored baseline; a recording of the flow end to end; the accessibility tree and a screen reader for anything a keyboard user must reach; for CLIs, golden stdout/stderr plus exit codes and a PTY harness for anything interactive; for APIs, a real client exercising the documented contract rather than the internal handler; …

### CPU, latency, throughput
A sampling profiler and a flame graph to see where time actually goes; a benchmark harness with a committed baseline; percentile latency (p50/p95/p99 — a mean hides the tail that users feel); load generation for throughput and saturation; instruction counts or cache misses where the change is that low-level; compile/build time as its own measurable; …

### Memory
Heap snapshot before and after, diffed by type or allocation site; allocation tracing to find the hot path; **leak detection by repetition** — run the operation N times and watch residency after a forced collection, since a single run shows nothing; RSS over a soak; GC pause frequency and duration; container memory limits and OOM behavior under real load; fragmentation for long-lived processes; …

### Concurrency and ordering
A race detector under the actual workload; deadlock and lock-contention inspection; deterministic or seeded schedulers that make an interleaving reproducible; stress and soak runs, since a race that shows up once in a thousand runs is invisible in one; assertions about ordering and idempotency under retry; verifying the operation is safe to run twice; …

### I/O, network, external calls
Request logs and a proxy to see exactly what left the process; packet capture when the claim is about the wire; connection and socket counts over time; assertions about retry counts, backoff, and timeout behavior under an injected slow or dead dependency; payload size and round-trip count, since one query becoming N is invisible to a passing test; TLS and certificate behavior; …

### Data and persistence
**Re-read the state after writing it** — a successful UPDATE is not evidence the row changed as intended; row counts and key field values; schema diff before and after a migration; applying the migration to a scratch database and, where the project supports it, reversing it; referential integrity and constraint behavior under the new shape; backup and restore for anything that changes stored format; data volume effects, since correct-at-ten-rows is not correct-at-ten-million; …

### Resource lifecycle
File descriptor and handle counts across repeated operations; thread and process counts; temp file and scratch directory cleanup; disk growth over a soak; connection pool occupancy under churn; anything acquired in a loop that must also be released in one; …

### Failure and recovery
Inject the failure rather than reasoning about it: dependency down, dependency slow, network partitioned, disk full, process killed mid-write, token expired, clock skewed; confirm the error surfaced is the one intended and that it reached the user legibly; confirm recovery actually recovers rather than wedging; rehearse the rollback, because a rollback path that has never been run is a hypothesis; …

### Security and permissions
Probe authentication and authorization from an unauthorized position rather than asserting the check exists in code; confirm data classified sensitive stays out of logs, errors, and URLs; secret scanning over the diff; dependency audit; SAST/DAST where available; verify the permission boundary from the outside — the interesting question is what an attacker can reach, not what the happy path does; …

### Build, packaging, supply chain
The build from clean; artifact contents and size; lockfile diff reviewed rather than accepted; reproducibility where the project claims it; SBOM and license changes; install from the built artifact into a fresh environment, since "works in the repo" and "works installed" are different claims; …

### Deployment and release
Health and readiness after deploy; canary or staged rollout metrics; the rollback, rehearsed; configuration and migration ordering between the two; backward compatibility across the version skew that will exist mid-rollout; …

### Observability itself
When a change adds a log line, a metric, or a span, **verify the signal appears** where it is supposed to, with the fields intended, and does not contain anything sensitive. Instrumentation is code, it can be wrong, and it is uniquely prone to being merged unverified because nothing fails when it is missing. …

### Numerical, statistical, model output
Comparison against a reference implementation within a stated tolerance, not exact equality; invariants that must hold regardless of input (conservation, monotonicity, bounds); behavior at boundaries and degenerate inputs — empty, single element, all-identical, extreme magnitudes; seeded determinism; distributional checks where a single output proves nothing; …

### Compatibility
The versions, platforms, browsers, locales, timezones, and screen sizes the project actually commits to supporting; upgrade and downgrade paths; behavior under a non-English locale and a non-UTC timezone, which is where date and sorting bugs live; …

### Agent and LLM behavior
Where the change touches prompts, skills, rules, or agent configuration, the instrument is an eval suite, not a unit test — see `evals/` if this project has one. Grade against a mechanical criterion; a single good-looking response is an anecdote. …

### Cost
Where a change alters resource consumption, token usage, or per-request spend, measure it. A correct change that triples cost is a decision someone should make deliberately. …

### Documentation and content
Links resolve; every code example actually runs; instructions followed from a clean environment by someone who does not already know the answer; …

---

# Part 3 — The `docs/VERIFY.md` template

```markdown
# Verification

Updated: {{today's date}}

Every change ships with verification. Do not report a task complete until the
checks for *this* change have run and passed.

This is not a checklist to match against. Most of it is a method, because a
checklist only covers changes someone already thought of.

## Deriving the check

{{Part 1's five steps, in this project's vocabulary, with a worked example
drawn from a real recent change in this repo. Keep the mutation check
prominent — it is the step people skip.}}

## How much rigor

{{Part 1's reversibility × blast-radius table, with this project's own
hard-to-revert surfaces named.}}

## Common change types

A shortcut for changes that come up often here. **If your change is not in this
table, that is expected — use the method above.**

| The change touches… | Verify with |
|---------------------|-------------|
| {{surface}} | {{exact commands, with directory}} |
| {{...}} | {{...}} |
| Markdown only | Re-read the diff; confirm links resolve; run any doc examples |

If a change spans rows, verify each — not just the cheapest one.

## Instruments available here

| To observe… | Use | Status |
|-------------|-----|--------|
| Behavior | {{real command}} | ✓ |
| User-facing behavior | {{real command}} | {{✓ / not available}} |
| CPU / latency | {{real command}} | {{...}} |
| Memory | {{real command}} | {{...}} |
| Concurrency | {{real command}} | {{...}} |
| Network / external calls | {{real command}} | {{...}} |
| Data and persistence | {{real command}} | {{...}} |
| Resource lifecycle | {{real command}} | {{...}} |
| Failure behavior | {{real command}} | {{...}} |
| Security | {{real command}} | {{...}} |
| Build and packaging | {{real command}} | {{...}} |
| Emitted logs/metrics/traces | {{real command}} | {{...}} |
| {{any class this project has that the catalog did not name}} | {{...}} | {{...}} |

{{Rows marked unavailable are gaps, listed deliberately. When a change needs one
of them, say so in the completion report rather than substituting a cheaper
instrument.}}

## Evidence

{{What this project keeps as proof, per instrument. The default: paste the
command's real output. For anything visual, the artifact the project's tooling
can actually produce — a screenshot, a recording, a diff image — and where it
is stored. For anything quantitative, both numbers and the conditions.

Do not mandate an artifact this project has no tooling to produce.}}

## Known false greens

{{Every lane that can pass while the thing is broken — a test lane running
outside the real sandbox, mocks that drift, a suite that skips on a missing
env var, a UI test asserting on a selector that no longer renders. Name them.
A verification doc that omits the lane people wrongly trust has failed at its
one job.}}

## What does NOT count

- A passing typecheck or build — proves it compiles, not that it behaves.
- "The diff looks right" — read it, then *exercise* it.
- Running only the tests you added — regressions live elsewhere.
- A log line saying an action succeeded — re-read the resulting state.
- A green suite under a claim the suite cannot see — the tests never measured
  the memory, the latency, or the pixel.
- A check that passes identically before and after the change.
{{project-specific false greens}}

## When you cannot verify

Say so explicitly: what you could not observe, why, and what would be needed.
Then verify at the nearest observable layer and label it a proxy. Never
silently substitute a cheaper instrument. An unverified change is not done, and
an incorrectly-verified change is worse, because it carries a claim nobody
checked.
```

---

## Rules

- **The method comes before the matrix.** A file that opens with a table teaches the table.
- The worked example must come from a real change in this repo — find one in `git log`. An invented example reads as filler and gets skipped.
- Keep every instrument class heading, including the ones this project lacks, marked as gaps. Deleting the row hides the gap; that is how a project goes years without ever measuring memory.
- Every command must be real and include its directory when that is not the repo root.
- Name the false-green lanes explicitly.
- No aspirational rows. If UI changes are checked by hand today, say that, and say it is a gap.
- End the catalog's lists open — the listed instruments are examples, and the file must say that reasoning from the observable is the fallback for anything unlisted.
- If the project already has a QA checklist or definition-of-done, build on it rather than replacing it.
