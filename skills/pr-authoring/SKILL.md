---
name: pr-authoring
description: Write a pull request title and body that a reviewer can accept without a round trip — outcome-first title, then problem → fix → scope decision → tests with exact per-lane counts → what the tests do not cover. Calibrates to the repo's own merged PRs before writing. Use before opening or editing any pull request.
allowed-tools: Read, Grep, Glob, Bash
---

# PR authoring

A PR body has one job: let the reviewer accept the boundary of the change
without asking. Most review round trips are not about the code — they are the
reviewer reconstructing what you decided not to do, and whether you checked the
thing they are worried about.

## Calibrate first

Before writing, read how this team actually writes PRs:

```
gh pr list --state merged --limit 10 --json number,title,body
```

Note what they do and don't do: title convention (Conventional Commits with a
scope, or plain descriptive), whether bodies use `##` sections, whether they
link tracker ids, whether they carry labels, how they report test results. Match
that. The skeleton below is the default when the history is thin or
inconsistent — never impose it over a convention the team clearly has.

## Title

State the **outcome**, not the mechanism. `fix(auth): deliver session cookies on
the redirect response` beats `fix middleware ordering`. Not a ticket number, not
a summary of the diff.

One PR is one coherent outcome, which may be several commits. If the work grew
mid-branch — a fix that spawned an audit — say so in the first line rather than
retroactively splitting it.

## Body

1. **`## The problem`** — the symptom first (what someone actually saw), then
   the root cause stated as established fact. A root-cause claim carries its
   evidence: `file:line`, a measured repro, a failing test you planted. Lead
   with the sharp sentence and bold it.
2. **`## The fix`** — the mechanism, and why that is the right lever. A minimal
   snippet or a before/after beats a paragraph.
3. **`## Scope decision`** — what deliberately does *not* ship, with reasons.
   This is the section that prevents the round trip. A short Ships / Deferred
   table works well. Name the adjacent thing the reviewer will wonder about and
   say why it is out.
4. **`## Tests`** — the red→green if you drove it that way, then **exact counts
   per lane** (`vitest 412/412`, `cargo nextest 88`, `tsc` clean,
   `lint --max-warnings=0` clean). Say which assertions are mutation-verified:
   reverting the fix makes them fail. A count is checkable; "tests pass" is not.
5. **`## Not covered by automated tests`** — the honest gap. Every project has
   surfaces its suite cannot reach; name the ones this change touches and say
   how you confirmed them instead (a manual run, a screenshot, a recording).
   State CI limits plainly if CI does not exercise this lane.
6. **Cross-references** — link related PRs by number and spell out the
   consequence for them ("#248 makes #246's comments false").

## Keep the honesty markers

Residuals, known-imperfect corners, "this is worth an upstream bug report, not
a workaround here" — these read as rigor, not hedging. Reviewers trust a PR that
names its own soft spots.

## Do not invent conventions

If the team's merged PRs carry no labels, add none. If they don't link tracker
ids in the body, don't add a `Closes #…` footer. Matching a convention the team
doesn't have costs the reviewer a comment.
