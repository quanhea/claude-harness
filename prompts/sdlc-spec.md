---
description: Generate docs/specs/ — the spec folder, template, and write-spec skill
outputs: ["docs/specs/README.md","docs/specs/TEMPLATE.md",".claude/skills/write-spec/SKILL.md"]
---

# Task: Generate the requirements-and-design spec setup

**Output:**
- `{{PROJECT_DIR}}/docs/specs/README.md`
- `{{PROJECT_DIR}}/docs/specs/TEMPLATE.md`
- `{{PROJECT_DIR}}/.claude/skills/write-spec/SKILL.md`

You are setting up the second link in the artifact chain: turning an accepted `intent/` file into a spec that conforms to this project's standards, with conflicts surfaced rather than buried.

Traditionally requirements and design are two phases owned by two roles, and a constraint that nobody encoded gets discovered in review, weeks late. Here they collapse into one session where the project's own standards — the rules, the architecture doc, the policy skills — are applied *while* the spec is written, and anywhere they contradict each other is flagged for a human to resolve before engineering starts.

The flagging is the valuable part. A spec that silently picks one side of a policy conflict is worse than one that stops and says "the security rule and the UX rule cannot both hold here."

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
2. "Inventory the standards a spec must conform to here: `.claude/rules/*.md`, `.claude/skills/*/SKILL.md`, `ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DESIGN.md`, and any policy docs found"
3. "Read docs/SDLC.md if present to match its source-of-truth configuration, and intent/README.md for the naming convention specs must mirror"
4. "Create docs/specs/ with README.md and TEMPLATE.md"
5. "mkdir -p .claude/skills/write-spec/ via Bash, then write SKILL.md naming the standards found in step 2"
6. "Verify the skill names real files — a skill that tells Claude to apply `docs/BRAND.md` in a repo with no such file will silently do nothing"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Important: directory creation

`.claude/` is a protected path. Run a Bash `mkdir -p .claude/skills/write-spec` before writing `SKILL.md`.

## docs/specs/README.md

```markdown
# Specs

One file per accepted intent, named to match it: `<yyyy-mm-dd>-<slug>.md`.

A spec takes an accepted `intent/<slug>.md` and answers *how*, within this
project's standards. It is written before any plan and before any code.

## What makes a spec done

- It solves the problem the intent stated, and answers that intent's open questions.
- It conforms to the standards listed in `TEMPLATE.md`, or says where it cannot.
- Its **Concerns** section is empty, or every entry has a named human decision.

A spec with unresolved concerns does not advance to build. Route each one to the
owner of the standard it conflicts with — that is usually faster than discovering
it in PR review, and it is always cheaper.

## Who writes one

{{The reviewer named in CODEOWNERS, or "the product owner"}}, using the
`write-spec` skill. No engineering skill is required to produce a first draft;
engineering judgment is required to accept one.

{{If a tracker is in use: one line on how the spec references its record,
matching docs/SDLC.md.}}
```

## docs/specs/TEMPLATE.md

Generate this with a **Standards applied** section listing what step 2 actually found. Do not list a standard this project does not have.

```markdown
---
intent: intent/<yyyy-mm-dd>-<slug>.md
status: draft
{{tracker-field if applicable}}
---

# Spec: <short title>

## Problem restated

One paragraph, traceable to the intent. If this cannot be written without
adding new requirements, the intent is not ready.

## Approach

What gets built, described so an engineer could plan it. Name the surfaces
that change — endpoints, screens, jobs, schemas — without designing the code.

## Behavior

The observable rules. Each one should be checkable: what the system does for
each input, state, and failure. This section is what the tests will encode.

## Out of scope

What this deliberately does not do, and why. The reviewer accepts a boundary
they can see; they interrogate one they cannot.

## Standards applied

{{One line per standard found in step 2, e.g.:
- `.claude/rules/architecture.md` — layer boundaries respected: <how>
- `docs/SECURITY.md` — auth and data handling: <how>
- `.claude/skills/<policy-skill>/` — <what it required>}}

## Concerns

Anywhere the standards conflict, or where meeting one means breaking another.
Each entry names the standards in tension, the options, and **who decides**.
Empty is a valid answer. A guess is not.

## Open questions from the intent

Each of the intent's open questions, answered — or explicitly deferred with a
reason.
```

## .claude/skills/write-spec/SKILL.md

Generate this naming the real standards from step 2.

```markdown
---
name: write-spec
description: Turn an accepted intent file into a requirements-and-design spec that conforms to this project's standards, flagging any place those standards conflict. Use when asked to "write a spec", "design this", "turn this intent into a spec", or when an intent has just been accepted.
allowed-tools: Read, Write, Glob, Grep, Bash
---

# Write a spec

## Read first

1. The intent file. If none was named, list `intent/` and ask which one.
2. Every standard this project holds a spec to:
{{the list from step 2, as literal paths}}
3. `ARCHITECTURE.md`, for what already exists and what it couples to.

Read them before drafting. A spec written first and checked second will be
written to be convenient, and the check will rationalize it.

## Draft

Fill `docs/specs/TEMPLATE.md`. Work outside-in: the observable behavior first,
then the surfaces that must change to produce it. Do not design internals — that
is the plan's job, and specifying it here removes the engineer's judgment without
adding information.

## Flag conflicts — do not resolve them

When two standards cannot both hold, say so in **Concerns**: name both, give the
options, and name who decides. Do not pick one and move on, and do not soften a
standard to make the conflict disappear.

The same applies when a standard would be *expensive* rather than impossible.
That is a decision for the person who owns the standard, not for the spec.

## Check yourself before handing it over

- Does every open question from the intent have an answer or an explicit deferral?
- Is every behavior rule checkable? Rewrite anything a test could not assert.
- Could an engineer plan from this without asking what was meant?
- Is anything in here a design decision that belongs in the plan?

## Commit

Commit the spec alongside a status update to the intent, so the request and the
decision land in the same record.
```

## Rules

- The **Standards applied** section and the skill's read-list must name only files that exist. Verify each path before writing it. This is the single most common way this artifact becomes decorative.
- If the project has no written standards at all, say so in `README.md` and keep the section with one line: standards are not yet written down. Do not invent policies.
- Do not create example specs.
- If `docs/specs/` already exists, read it and match what is there.
