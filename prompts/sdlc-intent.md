---
description: Generate intent/ — the proto-spec folder, template, and write-intent skill
outputs: ["intent/README.md","intent/TEMPLATE.md",".claude/skills/write-intent/SKILL.md"]
---

# Task: Generate the intent capture setup

**Output:**
- `{{PROJECT_DIR}}/intent/README.md`
- `{{PROJECT_DIR}}/intent/TEMPLATE.md`
- `{{PROJECT_DIR}}/.claude/skills/write-intent/SKILL.md`

You are setting up the first link in the artifact chain: the place where an idea, a ticket, or an incident becomes a written, version-controlled proto-spec in the originator's own terms.

The problem this solves: an idea normally traverses backlog entries, user stories, story points, and refinement meetings before anyone can act on it, and ownership transfers at every handoff — so what reaches engineering is several steps removed from what the originator meant. An `intent.md` is written once, by the person who wanted the thing, and carries their words forward unchanged.

**Intent states a problem, not a solution.** That is the whole discipline. A contributor who writes "add a Redis cache to the status endpoint" has skipped the stage; the intent is "customers phone in to ask where their claim is, and handlers spend a third of call time on it."

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
2. "Detect the issue tracker in use (`.github/ISSUE_TEMPLATE/`, ticket ids in recent commit messages, `.mcp.json` servers) so the template can carry a tracker reference field"
3. "Read docs/SDLC.md if it exists, to match the source-of-truth configuration it declares"
4. "Detect who reviews product-facing changes from CODEOWNERS, or note that no owner is defined"
5. "Create intent/ with README.md and TEMPLATE.md"
6. "mkdir -p .claude/skills/write-intent/ via Bash, then write SKILL.md"
7. "Verify the skill's frontmatter description names the triggers a non-engineer would actually type"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Where intent lives

Put `intent/` in this repository. Keeping the artifact chain next to the code derived from it is the point — a separate intent repository is only worth it when intent genuinely spans several repositories, and an umbrella repo uses a directory per sub-project instead of a second repo.

If this is an umbrella repo, `intent/` goes at the root, because intent is usually cross-cutting and the originator should not have to know which sub-project will implement it.

## Important: directory creation

`.claude/` is a protected path. Run a Bash `mkdir -p .claude/skills/write-intent` before writing `SKILL.md` — do not rely on Write to create the parent.

## intent/README.md

```markdown
# Intent

One file per idea, problem, or incident, named `<yyyy-mm-dd>-<slug>.md`.

An intent states a **problem**, not a solution. It is written by the person who
wants the thing, in their own words, and committed. Author and timestamp come
from git history, so the record of who asked for what is automatic.

## Who writes one

Anyone. You do not need to be an engineer and you do not need to know git —
brainstorm with Claude and ask it to write the result to this folder using
`TEMPLATE.md`, or invoke the `write-intent` skill, which does the interview for
you.

## What happens next

{{The reviewer named in CODEOWNERS, or "the product owner"}} reads it and either
advances it to a spec or closes it with a reason. That decision is the merge or
the closing review — there is no separate sign-off to chase.

## Status

Each file's front matter carries `status: draft | accepted | closed`. Accepted
intents get a spec in `docs/specs/`; closed ones stay here with the reason, so
the same idea does not get re-raised from scratch a quarter later.

{{If a tracker is in use: one line on how an intent references its ticket id,
matching the source-of-truth configuration in docs/SDLC.md.}}
```

## intent/TEMPLATE.md

```markdown
---
author:
date:
status: draft
{{tracker-field if a tracker is in use, e.g. "ticket:"}}
---

# Intent: <short title>

## Problem

What is happening today that should not be, or what is missing. Concrete and
observable — what someone saw, how often, who it affected. No proposed solution.

## Proposed outcome

What should be true instead, stated from the outside. Still not a design.

## Affected users and systems

Who feels this, and which parts of the product or platform are involved.

## Constraints

What must stay true regardless of the solution — policy, compliance, existing
auth, data handling, deadlines, things that must not change.

## Open questions

What you genuinely do not know. Leaving these here is correct; the spec stage
answers them.
```

## .claude/skills/write-intent/SKILL.md

```markdown
---
name: write-intent
description: Interview someone about a problem they want solved and write it up as an intent file in intent/. Use when someone says they have an idea, want to propose a feature, are reporting a recurring problem, or asks to "write this up", "file an intent", or "start a proposal".
allowed-tools: Read, Write, Glob, Grep, Bash
---

# Write an intent

Your job is to get a problem written down accurately in the originator's own
terms. You are the analyst in this conversation, not the designer.

## Interview

Ask the questions an analyst would ask, one or two at a time, in plain language.
No formal vocabulary — the person you are talking to may not be an engineer.

- What is happening now that shouldn't be? When did you last see it?
- Who does it affect, and how often?
- What would "solved" look like from their side?
- What must stay true no matter how it gets solved?
- What is explicitly not in scope?
- What don't you know yet?

Keep going until the problem is sharp enough that someone else could act on it.
Stop when the answers stop changing, not at a fixed number of questions.

## Hold the line on problem-not-solution

People arrive with a solution. That is normal and you should not fight it — take
the solution as a clue and ask what it would fix. "Add a cache" becomes "the page
takes eight seconds and people abandon it". Record the original suggestion under
open questions if they feel strongly; it is useful context for the spec, but it
is not the intent.

## Write it

Fill `intent/TEMPLATE.md` and save to `intent/<yyyy-mm-dd>-<slug>.md`. Use the
person's own phrasing wherever it is clear enough — do not translate their words
into product-speak.

Then read it back to them and ask what you got wrong. Correct it before
committing. The whole value of this artifact is that it says what they meant.

## Commit

Commit the file with a message naming the intent. Author and timestamp become
the record. If the person cannot commit themselves, say that you have written
the file and what they should do next.
```

## Rules

- The skill's `description` must name the phrases a non-engineer would actually say. "Use when writing an intent document" will never trigger; "I have an idea", "can you write this up" will.
- Do not add fields to the template that this project cannot fill. A tracker field only appears if step 2 found a tracker.
- Do not create example intent files. An empty `intent/` with a clear README is honest; a folder of invented examples teaches the wrong problems.
- If `intent/` already exists with real content, read it, match its conventions, and only add what is missing.
