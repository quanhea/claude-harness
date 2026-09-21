---
name: resolve-conflict
description: Resolve git merge conflicts by reading the file on both sides, understanding what each branch changed and why, then merging so neither side's intent is lost. Use when the user says "resolve conflict", "fix conflict", or after a failed merge or rebase.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# Resolve merge conflicts

A conflict is not a text-merge problem. It is two intents that need to survive
in one file. Read both sides until you can state what each was trying to do,
then write the version that does both.

## Procedure

1. `git status` — list every conflicted path.
2. For each conflicted file, read it to see the markers and how large the
   overlap really is.
3. Read the file as each branch has it: `git show <branch>:<path>`. The markers
   show you the collision; the two whole files show you the intent.
4. Read the recent commits that touched it on each side
   (`git log --oneline -5 <branch> -- <path>`). A conflict where one side is a
   rename or an extraction is unresolvable from the markers alone.
5. Resolve by keeping both intents wherever they are compatible. Dropping one
   side because it is smaller, or because it is "theirs", is how a merge
   silently reverts someone's work.
6. Validate before moving on: re-read the merged file against both originals
   and confirm nothing was lost. The markers being gone is not a resolution.
7. Run the checks the change type calls for — see `docs/VERIFY.md` if the
   project has one, otherwise the surrounding test suite plus a build. Conflicts
   in code that compiles are the easy case; conflicts in config, fixtures, or
   schemas usually need the thing actually run.

Use parallel agents when several files conflict independently.

## Conflicts that leave no markers

The dangerous conflicts merge cleanly. Two branches that each append a file to
an ordered set — database migrations, numbered fixtures, changelog fragments,
ordered route registrations — produce no conflict markers at all, because git
sees two additions. The breakage appears at run time, when the ordering or a
duplicate sequence number is wrong.

After any merge, check the ordered sets the project has:

- Migrations: list the migration directory for duplicate or out-of-order
  prefixes, re-sequence **your** branch's file to sort after the base branch's
  latest, then actually apply them against a real database — a file that exists
  is not a migration that runs.
- Any other directory where filename order is semantic: same check.

## Pre-commit hooks during a merge

If a pre-commit hook blocks the merge commit on pre-existing failures in files
your merge did not touch, skip that specific hook
(`SKIP=<hook-id> git commit …`) rather than bypassing verification wholesale
with `--no-verify`. Then say in the commit or the PR which hook you skipped and
why.
