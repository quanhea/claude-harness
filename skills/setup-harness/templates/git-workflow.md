# Template: Git Workflow Documentation

> Every project has a different git process. This MUST be discovered from the
> actual project, never assumed. The agent needs to know exactly how to branch,
> commit, push, create PRs, and merge for THIS project.

---

## How to Generate

**Launch an Explore agent** to discover the git workflow:

```
Agent(subagent_type: "Explore", prompt: "Analyze this project's git workflow thoroughly:

1. BRANCHING STRATEGY:
   - Is this trunk-based (push to main) or feature-branch based?
   - What branches exist? Run: git branch -a
   - Is there a develop/staging/production branch? What's the flow between them?
   - What's the branch naming convention? Run: git branch -a | head -30
   - Are there branch prefixes? (feature/, bugfix/, hotfix/, release/)

2. ENVIRONMENTS:
   - How many environments? (dev, staging, production, etc.)
   - Which branch maps to which environment?
   - How is code promoted between environments? (merge? cherry-pick? rebase?)

3. COMMIT CONVENTIONS:
   - Run: git log --oneline -30
   - What's the commit message format? (conventional commits? prefixes? ticket IDs?)
   - Are there commit message bodies or title-only?
   - Is there a commit hook enforcing format? Check .husky/, .git/hooks/, commitlint.config.*

4. PR PROCESS:
   - Run: gh pr list --state merged --limit 10 --json title,baseRefName,headRefName
   - What's the PR title format?
   - What's the PR body template? Check .github/PULL_REQUEST_TEMPLATE.md
   - Is there a PR checklist?
   - Are PRs merged with squash, merge commit, or rebase?
   - Run: git log --oneline --merges -10 (to detect merge strategy)

5. CODE UPDATE STRATEGY:
   - Does the team use rebase or merge to update feature branches with main?
   - Run: git log --graph --oneline -20 (to see merge patterns)

6. CI/CD GATES:
   - Are there required status checks before merge?
   - Check .github/workflows/ for which checks run on PRs
   - Is auto-merge enabled?

7. RELEASE PROCESS:
   - Are there release tags? Run: git tag --sort=-creatordate | head -10
   - Is there a changelog process?
   - How is production deployed? (tag? merge to release branch? manual?)

Report ALL findings with specific examples from the actual git history.")
```

---

## Output: docs/GIT_WORKFLOW.md

Write `docs/GIT_WORKFLOW.md` based on discoveries:

```markdown
# Git Workflow

> How code moves from idea to production in {{project-name}}.
> This is the source of truth for branching, committing, and merging.

## Branching Strategy

{{discovered — trunk-based? feature-branch? gitflow?}}
{{which branches exist and what each is for}}

### Branch Naming

{{discovered from actual branch names — e.g.:}}
{{- feature/<ticket-id>-description}}
{{- bugfix/<description>}}
{{- Or: no convention, just descriptive names}}

## Environments

| Branch | Environment | How code gets there |
|--------|-------------|-------------------|
{{discovered from branches + CI/CD}}

## Commit Conventions

{{discovered from git log — the actual format used:}}
{{- Message format (conventional commits? prefixes? ticket IDs?)}}
{{- Title only or title + body?}}
{{- Any enforced hooks?}}

### Examples (from actual history)

{{paste 5 real commit messages from git log}}

## Pull Requests

### Creating a PR

{{discovered — what base branch? what title format? any template?}}

### PR Body

{{discovered from PR template or recent PRs}}

### Merge Strategy

{{discovered — squash? merge commit? rebase?}}

### Required Checks

{{discovered from CI and branch protection}}

## Updating Branches

{{discovered — rebase or merge to update feature branches with main?}}

## Release Process

{{discovered — tags? release branches? changelog? deployment trigger?}}
```

---

## Also: Update .claude/rules/ with a git rule

Write `.claude/rules/git-workflow.md` (no frontmatter — loads every session):

```markdown
# Git Workflow Rules

{{Generated from the Explore agent findings. Examples of what to include:}}

## Branching
{{the actual rule — e.g., "always branch from main", "use feature/ prefix"}}

## Commits  
{{the actual format — e.g., "title only, no body, use [f]/[c]/[b] prefix"}}
{{or "conventional commits: feat:, fix:, chore:"}}

## Pull Requests
{{the actual process — e.g., "PR to main, squash merge, include ticket ID in title"}}

## Updating
{{how to update — e.g., "rebase on main before merging, never merge main into feature branch"}}
```

---

## Also: Replace hardcoded Merge Philosophy in PLANS.md

The Merge Philosophy section in `docs/PLANS.md` (from knowledge-docs.md template) should be
REMOVED and replaced with a reference to `docs/GIT_WORKFLOW.md`:

```markdown
## Merge Philosophy

See `docs/GIT_WORKFLOW.md` for the complete git workflow including branching,
committing, PR process, and merge strategy.
```

---

## For GREENFIELD projects

**Launch a research agent:**

```
Agent(subagent_type: "general-purpose", prompt: "Search for current git workflow
best practices for {{language}} {{framework}} teams as of {{year}}.
Find recommendations for:
1. Branching strategy (trunk-based vs feature-branch for small teams)
2. Commit message conventions (conventional commits? semantic?)
3. PR process (squash? merge? rebase?)
4. CI/CD integration patterns
5. Release versioning (semver? calver?)
Search for '{{language}} git workflow best practices {{year}}' and
'trunk based development vs gitflow {{year}}'")
```

Propose a workflow based on research. Mark everything as "proposed — customize for your team."

---

## Adaptation Instructions

1. EVERY section filled from Explore agent discovery — no hardcoded conventions
2. Include real commit message examples from git log (not made-up examples)
3. Include real branch names from git branch -a
4. Include real PR titles from gh pr list
5. If the project has .github/PULL_REQUEST_TEMPLATE.md, reference it
6. The git-workflow rule in .claude/rules/ should be concise — just the rules, not the explanation
7. If a convention can't be determined (too few examples), note it as "not yet established"
