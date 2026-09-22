---
description: Generate REVIEW.md — the review policy AI review passes run against
outputs: ["REVIEW.md"]
---

# Task: Generate REVIEW.md

**Output:** `{{PROJECT_DIR}}/REVIEW.md`

You are creating `REVIEW.md` — the policy that automated review passes run against, so every PR gets the same passes with findings ranked by severity, and humans spend their review time on whether the change matches intent and carries acceptable risk.

Review capacity is what limits throughput once agents write most of the code. The fix is not a faster human; it is making the mechanical passes uniform and automatic, so the human review that remains is the judgment part. The agent that wrote the code has no way to approve it — that separation is what makes this safe.

The failure mode this file prevents is a review bot that produces fifty nits per PR and gets muted within a week. Severity discipline and an explicit exclusion list are what keep it useful.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
2. "Launch the Explore agent to find what is ALREADY enforced mechanically (see prompt below) — anything a linter, formatter, type checker, or CI gate already catches must be excluded, not re-reviewed"
3. "Read the project's standards: `.claude/rules/*.md`, `docs/SECURITY.md`, `docs/TDD-RULES.md`, `ARCHITECTURE.md`, and any policy skills in `.claude/skills/`"
4. "Identify generated, vendored, and frozen paths from `.gitignore`, `.gitattributes` (`linguist-generated`), lockfiles, and any `vendor/`, `generated/`, or legacy directories"
5. "Determine the review passes this project actually needs, each traceable to a standard from step 3"
6. "Write REVIEW.md following the template"
7. "Verify no pass duplicates something step 2 found already enforced"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Explore Agent Prompt (Task 2)

```
Agent(subagent_type: "Explore", prompt: "Find everything in this project that is ALREADY enforced mechanically, so a review pass does not duplicate it:
1. Linter and formatter configs, and which rules they have enabled (not just that they exist)
2. Type checking — is it strict, and does CI fail on it
3. Pre-commit hooks and .claude/hooks/ scripts, and what each one blocks or warns about
4. CI jobs that gate merge, and exactly what each asserts
5. Branch protection settings if visible (.github/, CODEOWNERS)
6. Test coverage gates and their thresholds
7. Security scanning — SAST, dependency audit, secret scanning — and what it covers
8. Generated, vendored, or frozen directories that should never be reviewed
Report each with the file path and the specific check, so I can exclude it from human-judgment review passes.")
```

## Template

```markdown
# Review policy

Updated: {{today's date}}

Every PR gets these passes. Findings are ranked by severity and posted to the
PR; they do not approve or block it. A human code owner still approves, and
branch protection still requires it — the passes exist to make that approval an
informed judgment rather than a line-by-line hunt.

## Passes

{{One section per pass, each traceable to a standard. Only include passes this
project has a standard for. Typical set:}}

### Correctness

Bugs the tests do not catch: wrong boundary conditions, unhandled error paths,
state that can be observed mid-update, concurrency assumptions that do not hold.
Cite `file:line` and describe the input that produces the wrong behavior.

### Security

Against `{{docs/SECURITY.md or the real path}}`. {{The specific things that
matter here — auth on new endpoints, data classification in logs, input
validation at boundaries, secret handling.}}

### Conformance to the spec and plan

Where `docs/specs/<slug>.md` and the plan exist for this change, check the diff
against them. Report where the implementation departs from the plan without the
plan having been updated — that is the signal, not the departure itself.

### {{Project-specific pass, e.g. "Architecture"}}

Against `{{.claude/rules/architecture.md}}`. {{Layer boundaries, dependency
direction, module coupling.}}

### Tests

Against `docs/TDD-RULES.md`. Assertions that a plausible-but-wrong
implementation would still satisfy; tests changed to make failing code pass;
tests deleted alongside the behavior they covered.

## Severity

| Severity | Meaning | What happens |
|----------|---------|--------------|
| **Important** | Wrong behavior, a security or data risk, or a standard violated | Must be resolved or explicitly accepted by the code owner before merge |
| **Nit** | Style, naming, or preference where the code is not wrong | Optional. Author may close without comment |

There is no middle tier, deliberately. A third severity becomes the default and
the distinction stops carrying information.

**Nit budget: {{a number, default 5}} per PR.** Past that, report the count and
the top few rather than listing all of them. A review nobody reads enforces
nothing.

## Exclusions

Never report findings on:

{{From step 2 and step 4 — the real list, e.g.:
- Anything `{{linter}}` already enforces: {{the specific rules}}
- Formatting of any kind — `{{formatter}}` owns it
- {{generated paths}} — generated, reviewed at the generator
- {{vendored paths}} — vendored
- {{frozen/legacy paths}} — frozen; changes go in {{where}}}}

A finding that duplicates a mechanical check is noise: the check already caught
it, or the check is misconfigured and *that* is the bug.

## Fix loop

Tag `@claude` on a review comment to have the fix pushed to the branch. The
author stays responsible for the result; a pushed fix is a suggestion that
happens to compile, not an approval.

## Tuning

{{The reviewer named in CODEOWNERS, or "the tech lead"}} reviews this file
{{monthly}}: rate whether findings were accurate, drop passes that produce
mostly noise, and adjust the nit budget. A pass that has not produced an
Important finding in two months is a candidate for deletion.
```

## Rules

- Every pass must trace to a standard that exists in this repo. A pass with no standard behind it produces opinions, and opinions are what the Nit budget is for.
- The exclusion list is not optional and must be specific. "Don't report style issues" is not an exclusion; naming the linter and its enabled rules is.
- Keep exactly two severities.
- Do not write a pass for anything Explore found already mechanically enforced. Note it in exclusions instead.
- If the project has no written standards, write the file with Correctness and Tests only, and say plainly that the other passes await written policy.
