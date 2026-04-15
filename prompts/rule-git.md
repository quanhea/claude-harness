---
description: Generate .claude/rules/git-workflow.md
outputs: [".claude/rules/git-workflow.md"]
---

# Task: Generate .claude/rules/git-workflow.md

**Output:** `{{PROJECT_DIR}}/.claude/rules/git-workflow.md`

You are generating the git workflow rule file — loaded every Claude session. It must reflect the actual branching strategy, commit conventions, and PR process found in the project's git history.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Launch Explore agent to discover git workflow — branching, commits, PR process, CI gates"
3. "Read existing .claude/rules/git-workflow.md if present (merge)"
4. "Write .claude/rules/git-workflow.md following the exact template"
5. "Verify all conventions match actual git history patterns found"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Explore Agent Prompt (Task 2)

```
Agent(subagent_type: "Explore", prompt: "Analyze this project's git workflow thoroughly:

1. BRANCHING STRATEGY:
   - Is this trunk-based (push to main) or feature-branch based?
   - Run: git branch -a | head -20
   - What branch naming convention is used? (feature/, bugfix/, hotfix/, etc.)
   - Is there a develop/staging/production branch structure?

2. COMMIT CONVENTIONS:
   - Run: git log --oneline -30
   - What's the commit message format? (conventional commits? ticket IDs? prefixes?)
   - Are there commit hooks? Check .husky/, .git/hooks/, commitlint.config.*

3. PR PROCESS:
   - Run: gh pr list --state merged --limit 10 --json title,baseRefName,headRefName
   - What's the PR title format?
   - Check .github/PULL_REQUEST_TEMPLATE.md for PR body template
   - Are PRs merged with squash, merge commit, or rebase?
   - Run: git log --oneline --merges -10

4. CI/CD GATES:
   - Check .github/workflows/ for which checks run on PRs
   - Are there required status checks before merge?

5. RELEASE PROCESS:
   - Run: git tag --sort=-creatordate | head -10
   - Are there release tags? How is production deployed?

Report ALL findings with specific examples from actual git history.")
```

## Template

```markdown
# Git Workflow Rules

## Worktree-First Local Development (non-negotiable)

Code changes happen ONLY inside a git worktree. Branches are for remote
history; locally, every branch you work on lives in its own worktree with
its own isolated database, queue, cache, and `.env.local`.

- **Starting a task**: run `claude -w` (preferred — also names the branch) or `git worktree add <path> -b <branch>`.
- **NEVER** run `git checkout -b <branch>` in the main repo directory and edit files there. That path bypasses the post-checkout provisioning hook and will corrupt shared local-service state.
- **When done**: `git worktree remove <path>` then `npm run wt:cleanup` (or the project's equivalent — see `docs/WORKTREE.md`).
- **If you find yourself about to edit on `main`/`master`/`trunk`**: STOP and open a worktree first.

See `docs/WORKTREE.md` for the service-provisioning mechanics, safety markers, and troubleshooting.

## Branching Strategy

{{discovered — trunk-based or feature-branch? What's the main branch?}}

**Branch naming**: `{{discovered pattern — e.g. feature/TICKET-description, or "no convention found"}}`
**Branch from**: `{{discovered — main? develop?}}`
**Merge to**: `{{discovered}}`

## Commit Conventions

{{discovered — format from actual git log:}}
**Format**: `{{e.g. "type(scope): description" or "TICKET-123: description" or "no convention found"}}`
**Example**: `{{actual commit message from git log}}`

{{if commit hook exists:}}
**Enforced by**: `{{hook file path}}`

## PR Process

1. Branch from `{{main/develop}}`
2. {{push and open PR}}
3. {{required checks must pass — list them if found}}
4. {{merge strategy: squash / merge commit / rebase}}

**PR title format**: `{{discovered or "no convention found"}}`

## What NOT to Do

- Never force-push to `{{main branch}}`
- Never commit directly to `{{protected branches}}` without a PR
- Never skip CI with `--no-verify` without explicit approval
```

## Rules

- This file has NO frontmatter — it loads every session.
- All conventions must come from actual git history — not assumed defaults.
- If this is a greenfield repo (check: `git log --oneline | wc -l` returns a small number, or no `.git` directory), write recommended defaults and mark the whole file as "proposed".
- If `.claude/rules/git-workflow.md` already exists, read it first and MERGE.
