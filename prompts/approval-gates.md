---
description: Generate PreToolUse approval-gate hooks for actions requiring authorization
outputs: [".claude/hooks/gate-*.sh"]
---

# Task: Generate approval-gate hooks

**Output:** `{{PROJECT_DIR}}/.claude/hooks/gate-<name>.sh`, wired into `.claude/settings.json`

You are generating the deterministic half of policy enforcement: `PreToolUse` hooks that sit in front of actions the organization requires authorization for, and answer one of three ways — **allow** (exit 0), **ask** (exit 1, pause for a human), or **block** (exit 2, refuse with a reason).

This is distinct from the `hooks` task, which generates PostToolUse linters that warn after an edit. The dividing line is in the playbook and it is sharp: **a hook that asks a human for approval does not belong in the build loop**, because an approval prompt on every edit puts a person back on the critical path and the speed is gone. Build-time hooks are fast, narrow, and non-blocking. Gates are rare, consequential, and blocking.

The other half is that skills are advisory — they make a violation uncommon. A gate makes it nearly impossible. Generate a gate only where "uncommon" is not good enough.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
2. "Launch the Explore agent to find consequential actions in this project (see prompt below)"
3. "Read `.claude/settings.json` for existing hooks and the deny list — never duplicate something the deny list already covers"
4. "Decide which gates this project genuinely needs (see the bar below) and what each one's authorization signal is"
5. "Write each gate script to .claude/hooks/gate-<name>.sh and chmod +x"
6. "Wire each into .claude/settings.json PreToolUse, merging with existing hooks"
7. "Test each gate both ways: confirm it blocks the unauthorized case and allows the authorized one"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Explore Agent Prompt (Task 2)

```
Agent(subagent_type: "Explore", prompt: "Find the actions in this project that are consequential enough to need authorization:
1. Deploy and release commands — scripts, Makefile targets, CI triggers, and which environments each reaches
2. Anything that touches production: kubectl contexts, cloud CLI profiles, terraform workspaces, database connection strings
3. Destructive data operations — migrations that drop or rewrite, truncate, bulk delete, restore-from-backup
4. Paths that must not be hand-edited — generated code, vendored trees, frozen legacy packages, lockfiles, .circleci/ or other CI config with a named owner
5. Secret and credential handling — where secrets live, what reads them
6. Any CODEOWNERS entry implying a named human must approve changes to a path
For each: the exact command or path pattern, the environment it reaches, and any existing guard.")
```

## The bar

A gate is justified when the action is **consequential** (production, data loss, money, or a compliance boundary) and **its authorization is checkable from the environment**. If you cannot name the signal that means "approved", you cannot write the gate — write nothing and say what the project would need to decide.

Do not gate:

- Anything the `deny` list in settings.json already refuses outright.
- Ordinary edits, tests, or builds. Gating those is how teams end up disabling hooks entirely.
- Policy that is merely important. That is what `policy-skills` is for.

Two or three gates is a healthy number. A dozen means the bar slipped.

## Gate script format

```bash
#!/usr/bin/env bash
# {{what this gates and why}}
# PreToolUse gate. Exit 0 = allow, 1 = ask a human, 2 = block with reason.

set -euo pipefail

# Skip while claude-harness is scaffolding.
[ "${CLAUDE_HARNESS_SETUP:-}" = "1" ] && exit 0

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# Fast path: get out of the way of everything this gate does not govern.
case "$COMMAND" in
  {{the narrow pattern this gate matches}}) ;;
  *) exit 0 ;;
esac

# The authorization signal.
if [ "${{{APPROVAL_ENV_VAR}}:-}" = "" ]; then
  echo "{{What is blocked, why, and exactly how to get authorized — a named}}" >&2
  echo "{{person, a process, or the variable to set. A block with no path}}" >&2
  echo "{{forward gets worked around.}}" >&2
  exit 2
fi

exit 0
```

`stderr` becomes Claude's feedback context on a block, so it must say what to do next, not only that the door is shut.

## settings.json wiring

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/gate-{{name}}.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

Merge with existing hooks; never overwrite.

## Where gates live

Gates in `.claude/settings.json` are team-owned and Git-tracked, which means an engineer can edit them — appropriate for team conventions.

Gates that must not be editable by the people they govern belong in **managed settings**, owned by the platform or IT team and deployed outside the repo. Note in your summary which of the gates you generated would belong there, so whoever owns that decision can move them. Do not attempt to write managed settings yourself — they are deliberately outside this repo's control.

## Rules

- Every gate's `stderr` names the path to authorization. A block without one trains people to bypass the tool.
- Every gate opens with the fast path that exits 0 on anything it does not govern. A gate that inspects every command is a latency tax on the whole session.
- Test both directions before finishing. An untested gate is as likely to block everything as nothing.
- Never gate an action the deny list already refuses; that is a double denial with a confusing message.
- If nothing clears the bar, generate no gates and say what the project would need to decide first. An invented gate blocking a command nobody runs is pure cost.
- `chmod +x` every script.
