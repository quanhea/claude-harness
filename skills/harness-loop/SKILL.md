---
name: harness-loop
description: Agent-to-agent review loop (Ralph Wiggum Loop). Implements the pattern from the article where agents review their own changes, request additional agent reviews, respond to feedback, and iterate until all reviewers are satisfied. Use when wanting thorough self-review before merging, or when the user says "review loop", "self-review", or "iterate until clean".
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Agent
argument-hint: [number of review rounds, default 3]
---

# Harness Loop (Agent-to-Agent Review)

Run a self-review loop on the current changes, iterating until all checks pass.

Article reference: "we instruct Codex to review its own changes locally, request
additional specific agent reviews, respond to any feedback, and iterate in a loop
until all agent reviewers are satisfied."

## Context

- Current changes: !`git diff --stat 2>/dev/null || echo "no changes"`
- Current branch: !`git branch --show-current 2>/dev/null || echo "unknown"`

## Parameters

Maximum review rounds: $ARGUMENTS (default: 3)

## Process

### Round N (repeat until clean or max rounds reached):

#### Step 1: Self-Review
Review the current changes yourself:
- Read all modified files (`git diff`)
- Check architecture compliance against `docs/ARCHITECTURE.md`
- Check boundary validation
- Check test coverage for new behavior

#### Step 2: Delegate to @reviewer
Ask the `@reviewer` agent to independently review the same changes.
Collect its findings.

#### Step 3: Delegate to @architect
Ask the `@architect` agent to check for architectural drift.
Collect its findings.

#### Step 4: Fix Issues
For each finding from Steps 1-3:
- If it's a 🔴 Blocker: fix it immediately
- If it's a 🟡 Warning: fix it if straightforward
- If it's a 🔵 Suggestion: note it but don't block

#### Step 5: Validate
Run the project's test suite.
Run `${CLAUDE_PLUGIN_ROOT}/scripts/validate-docs.sh` to check knowledge base.

#### Step 6: Decision
- If no 🔴 or 🟡 issues remain AND tests pass → **APPROVED. Exit loop.**
- If issues remain and rounds left → go to Step 1 with the new changes
- If max rounds reached → report remaining issues for human review

## Output

After the loop completes, provide:
- Number of rounds executed
- Issues found and fixed per round
- Remaining issues (if any) that need human attention
- Final verdict: **CLEAN** or **NEEDS HUMAN REVIEW**

## Important

- Each round should make progress — if the same issue persists across 2 rounds, escalate
- Don't make changes outside the scope of the current diff
- Run tests after each fix round to verify no regressions
