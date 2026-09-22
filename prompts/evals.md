---
description: Generate evals/ — a regression suite for the agent configuration itself
outputs: ["evals/README.md","evals/check.sh",".github/workflows/agent-evals.yml"]
effort: high
---

# Task: Generate the agent eval suite

**Output:**
- `{{PROJECT_DIR}}/evals/README.md`
- `{{PROJECT_DIR}}/evals/check.sh`
- `{{PROJECT_DIR}}/evals/<slug>.json` (the cases you can ground in real work)
- `{{PROJECT_DIR}}/.github/workflows/agent-evals.yml`

The test suite covers the product. This covers **the agent configuration** — `CLAUDE.md`, the rules, the skills, the hooks. Those files change, models change underneath them, and nothing today tells you when a change made the agent worse at this codebase.

Evals are the AI-native equivalent of stage-gate QA: a suite that runs whenever the agent's configuration changes, and gates that change on the result.

Treat the suite as living. As models improve, a case that used to discriminate stops discriminating — everything passes it and it stops carrying information. Those get replaced, not celebrated.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
2. "Read CLAUDE.md, .claude/rules/*.md, and .claude/skills/*/SKILL.md — every claim in them is a candidate eval, because a claim nothing tests is a claim that will quietly stop being true"
3. "Find real recent tasks to ground cases in: `git log --oneline -60`, merged PR titles, and the conversation history under ~/.claude/projects/<slug>/ if present"
4. "Find the cheapest verifiable check per case — a command that exits non-zero, a file that must or must not change, a string that must appear in the diff"
5. "Write evals/check.sh — the deterministic grader"
6. "Write one evals/<slug>.json per grounded case (aim for 5-10 now; the suite grows to 20-50 as real work accumulates)"
7. "Write .github/workflows/agent-evals.yml triggered on changes to CLAUDE.md and .claude/**, plus a nightly schedule"
8. "Write evals/README.md explaining how to add a case and the incident→eval rule"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## What makes a case worth writing

Ground every case in something that actually happened. A case invented from the template tests the template.

The highest-value cases come from three places:

- **A claim in `CLAUDE.md` or a rule.** "Money is always the decimal type, never a float" is a testable assertion: ask for a change that touches money and check what comes back.
- **A correction the team has made twice.** That is exactly what the "Things Claude gets wrong" section records, and each line there is an eval waiting to be written.
- **An incident.** Every production incident traced to agent-written code becomes a permanent case. That rule is what stops the suite from decaying into whatever was easy to write on day one.

Acceptance criteria must be **mechanical**. "Produces good code" cannot be graded. "`grep -q 'BigDecimal' the diff` and `make test` exits 0" can.

## Eval case format

```json
{
  "name": "{{slug}}",
  "prompt": "{{the task, phrased as a person would actually ask it}}",
  "allowedTools": "Read,Edit,Bash({{the specific test command}})",
  "assert": {
    "command": "{{a command run after the session, exiting non-zero on failure}}",
    "diff_must_match": "{{optional regex the diff must contain}}",
    "diff_must_not_match": "{{optional regex the diff must not contain}}",
    "files_must_not_change": ["{{paths the task had no business touching}}"]
  },
  "grounded_in": "{{the commit, PR, or incident this came from}}"
}
```

`grounded_in` is required. A case that cannot name where it came from is a case someone invented, and it will test the imagination rather than the codebase.

## evals/check.sh

Write a POSIX shell grader that takes the eval file and the session result, applies each assertion present, prints one line per assertion, and exits non-zero if any fail. Keep it dependency-light — `jq`, `git`, and the project's own commands. It runs in CI, so its failure output must say which assertion failed and what it saw.

## The CI workflow

```yaml
name: Agent evals

on:
  pull_request:
    paths: ['CLAUDE.md', '.claude/**', 'evals/**']
  schedule:
    - cron: '0 2 * * *'

jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @anthropic-ai/claude-code
      - name: Run eval suite
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          fail=0
          for eval in evals/*.json; do
            claude -p "$(jq -r '.prompt' "$eval")" \
              --allowedTools "$(jq -r '.allowedTools' "$eval")" \
              --output-format json > result.json || true
            ./evals/check.sh "$eval" result.json || fail=1
          done
          exit $fail
```

The `paths` trigger is the point: this runs when the **agent configuration** changes, which is exactly when nothing else would catch a regression.

## evals/README.md

Cover: what the suite is for, how to add a case (including that `grounded_in` is required), the incident→eval rule, that cases everything now passes should be replaced rather than kept, and the API cost — this suite spends money on every run, so the schedule is a budget decision.

## Rules

- Every case names `grounded_in`. No exceptions.
- Every assertion is mechanical. If you cannot write the check, do not write the case.
- Generate only as many cases as you can genuinely ground. Five real ones beat thirty invented ones, and the README says how the suite grows.
- Scope `allowedTools` per case to the narrowest set that lets the task succeed. An eval that can run anything tests nothing about what the agent chooses to run.
- `files_must_not_change` is the cheapest strong assertion available — a task that edits its own test file to pass has failed, and only this catches it.
- If no `ANTHROPIC_API_KEY` is plausibly configured, still write the suite, but leave the workflow's schedule commented out and say which secret to set.
- Do not gate merges on this until the suite has run clean for a week. A new eval suite is mostly false positives, and the first one to block a legitimate PR gets the whole thing deleted.
