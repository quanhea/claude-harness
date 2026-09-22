---
name: verify-change
description: Work out how to actually prove a specific change works, and then do it — derive the right instrument from what the change claims, rather than defaulting to the test suite. Use before reporting any task complete, when asked to "verify this", "prove it works", "check this actually fixed it", or when a change claims something the tests cannot see (performance, memory, a visual result, a leak, a race, an emitted signal).
allowed-tools: Read, Bash, Grep, Glob
---

# Verify this change

The default failure is quiet: run the test suite, see green, report done — when the suite was never able to observe the thing the change claimed. A memory fix passes a suite that measures no memory. A latency fix passes a suite that measures no time.

So do not start from the commands available. Start from the claim.

## 1. State the claim

One sentence, in terms observable from outside the code. Write it down before choosing any command.

- Not "refactored the session handler" — that describes the diff.
- Not "fixed the bug" — that names no observable.
- Yes: "a request arriving after the token expires gets a 401 with a renewal hint instead of a 500."
- Yes: "peak heap after 10k parses stays flat instead of growing ~4MB per thousand."

If you cannot write the claim without describing the implementation, this change has no externally visible effect on its own. Say so, and verify at the next layer out that does.

## 2. Name what would differ

If it works, what is measurably different? Point at a number or a state: a returned value, a persisted row, a rendered pixel, an emitted event, a p99, a heap residency, a file-descriptor count, a log line that should now be absent.

## 3. Pick the instrument that can see it

**The instrument must be able to observe the claim failing.** If it cannot, it is not verification no matter how green it is.

Read `docs/VERIFY.md` if the project has one — it lists the real instruments and their commands, and which classes the project lacks. If it does not, work from what the claim needs:

| The claim is about… | Reach for |
|---|---|
| Behavior, a returned value, stored state | Tests; then re-read the state directly rather than trusting the write |
| What a user sees or can do | Drive the real UI — browser or device automation, a screenshot against the design, the accessibility tree for keyboard and screen-reader paths |
| Speed | A profiler and a flame graph for *where*; a benchmark with a baseline for *how much*; percentiles, never a mean |
| Memory | Heap snapshot diffed before/after; **repeat the operation N times** and check residency after a forced collection — one run shows nothing |
| A leak of anything else | Same shape: repeat, then count. File descriptors, handles, threads, connections, temp files, disk |
| Concurrency | A race detector under real load; stress and soak, because a one-in-a-thousand interleaving is invisible in one run |
| What leaves the process | Request logs, a proxy, packet capture; count the round trips — one query becoming N passes every test |
| Failure handling | Inject the failure. Kill the dependency, slow it, fill the disk, expire the token. Reasoning about the path is not exercising it |
| Data shape or a migration | Apply it to a scratch database, diff the schema, reverse it if the project supports that, and check behavior at real data volume |
| Security or permissions | Probe from the unauthorized position. Asserting the check exists in code is not the same as it holding |
| A log, metric, or span you added | Confirm the signal actually appears, with the fields intended and nothing sensitive in it. Nothing fails when instrumentation is missing |
| Prompts, skills, or agent config | An eval with a mechanical criterion. One good-looking response is an anecdote |
| Build or packaging | Build clean, then install the artifact into a fresh environment |

This table is a starting point, not a menu — plenty of claims are not on it. When yours is not, go back to step 2: name the observable, then find the tool that reads *that*, at its own layer.

## 4. Get the baseline first

For anything quantitative, capture the before. "180ms" and "42MB" mean nothing alone. Stash the change, measure, restore, measure again. Record the conditions with the numbers — machine, dataset size, warm or cold, concurrent load — because a comparison across different conditions is not a comparison.

## 5. Run the mutation check

**Undo the change and confirm the observation reverts.** Revert the fix and watch the new test fail. Re-run the benchmark on the baseline. Load the old build and confirm the bug is still there.

A check that passes both before and after proves nothing about the change. This is the step that gets skipped, and skipping it is how a test that asserts nothing ships as evidence.

## 6. Check the neighbors

Run the surrounding suite, not only what you added — the regression usually lands next door. Exercise one adjacent flow that shares state, a code path, or a dependency with what you touched.

## 7. Report what you actually did

- The claim, as you wrote it in step 1.
- The instrument, and the **real output** — paste it; do not summarize it as "passed".
- Both numbers, for anything quantitative, with conditions.
- The mutation check result.
- **What you could not verify**, named explicitly, with why and what would be needed.

That last one is not a failure to admit; it is the most useful line in the report. "Memory was not measured — this project has no heap tooling" is true and actionable. "Tests pass" under a memory claim is neither.

## Scale the effort

Match rigor to what a wrong answer costs — how reversible the change is, and how far it reaches. A contained, easily-reverted change needs the instrument run once. Anything touching money, auth, or stored state is hard-to-revert regardless of diff size: instrument, mutation check, adjacent flows, and the failure modes.

## Never

- Swap in a cheaper instrument silently because the right one is missing. Say it is a proxy.
- Report a green suite as evidence for a claim the suite cannot observe.
- Trust a success log over re-reading the resulting state.
- Change the test to make it pass.
