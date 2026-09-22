---
description: Encode existing written policies as skills (distinct from history-mined skills)
effort: high
---

# Task: Encode this project's written policies as skills

**Output:** `{{PROJECT_DIR}}/.claude/skills/<policy-name>/SKILL.md`

The `skills` task mines conversation history for flows the team repeats. This task does something different: it takes **policy that is already written down somewhere** — a security standard, an API convention, a brand guideline, a data-handling rule — and turns it into a skill that applies while the code is being written, instead of being discovered in review three days later.

This is how institutional knowledge becomes operational: explicit, version controlled, applied everywhere, updated centrally when the policy changes.

**A skill is an advisory control.** It makes Claude very likely to apply the policy; nothing forces a session to comply. For policy that must hold absolutely, the skill is one layer and a deterministic hook is the other — skills make violations uncommon, hooks make them nearly impossible. Where you find policy in that category, say so in the skill and note that the `approval-gates` task should carry the hard half.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
2. "Launch the Explore agent to find written policy in this repo (see prompt below)"
3. "List `.claude/skills/` — never duplicate an existing skill; extend it instead"
4. "For each policy found, decide whether it qualifies (see the bar below). Write the shortlist and the rejections to `.claude-harness/policy-candidates.md`"
5. "For each qualifying policy, find the checkable form: a script, a schema, a linter rule, or a command that produces evidence"
6. "mkdir -p .claude/skills/<name>/ via Bash for each, then write SKILL.md"
7. "Verify each skill's description names concrete triggering situations — claude-md builds the Skills table from that frontmatter; do not edit CLAUDE.md here, several tasks generate skills in parallel and would clobber each other"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

**Gate check:** `.claude-harness/policy-candidates.md` must exist on disk before you write any SKILL.md. If no policy qualifies, write that file saying so and generate zero skills.

## Explore Agent Prompt (Task 2)

```
Agent(subagent_type: "Explore", prompt: "Find written policy and convention in this repo that an agent should apply while writing code:
1. Security standards — auth requirements, data classification, secret handling, audit logging (docs/SECURITY.md, SECURITY.md, any security/ dir)
2. API conventions — endpoint shape, versioning, error format, pagination, OpenAPI specs and how they're enforced
3. Data handling — PII rules, retention, what may appear in logs or error messages
4. Architecture rules — layer boundaries, dependency direction, what may import what
5. Brand, copy, or UX standards — tone, component usage, accessibility requirements
6. Compliance obligations named anywhere — SOC2, HIPAA, GDPR, PCI, and what they require of code
7. Anything in CONTRIBUTING.md, a wiki export, an ADR, or a docs/ page that reads as 'you must'
For each: the file path, who owns it if stated, whether it is enforced by anything today, and whether it is specific enough to check.")
```

## The bar a policy must clear

Write a skill only when all four hold:

1. **It is already written down.** You are encoding policy, not inventing it. If it lives only in someone's head, the output of this task is a note that it needs writing, not a skill asserting what you guessed.
2. **It applies broadly.** A rule that touches one file is a comment in that file.
3. **It is checkable.** The skill can end with a command, a schema, or an inspection that produces evidence. A skill that says "write secure code" changes nothing.
4. **Nothing already enforces it deterministically.** If a linter rule or CI gate covers it, the skill is redundant — note it and move on.

Record every rejection and its reason in `.claude-harness/policy-candidates.md`. The rejections are useful: they are the list of policies that need writing down or enforcing.

## SKILL.md shape

```markdown
---
name: {{kebab-case, matching the directory}}
description: {{What it enforces, then the concrete situations that should trigger it — "Use whenever creating or modifying an external-facing endpoint, reviewing API code, or generating an OpenAPI spec." A description that only names the policy will not fire.}}
---

# {{Policy name}}

Source of truth: `{{the policy file}}`{{, owned by <owner> if known}}.

When you {{the triggering action}}:

1. {{Numbered, specific, checkable requirements — the policy's actual clauses,
   in the imperative, each one something a reader could verify was done or not}}
2. ...

{{The evidence step — e.g. "Run `scripts/check-endpoints.sh` and include its
output in your summary." If the project has no such check, say what to inspect
and what a pass looks like.}}

{{If this policy must hold absolutely: "This is advisory. The blocking control
is <hook>; see .claude/hooks/." — only if such a hook exists or is planned.}}
```

## Rules

- Numbered, specific clauses. Prose paragraphs do not survive being applied under pressure.
- The `description` is what decides whether the skill ever fires. Name the situations, not the topic.
- Quote the policy's own requirements; do not paraphrase them into something weaker or stronger. If the policy is vague, say so in the skill and name the owner to ask.
- Never overwrite an existing skill. If one covers part of the policy, extend it and say what you added.
- Point at the source of truth by path so a reader can check whether the skill has drifted from it.
- Zero skills is a valid outcome. An invented policy is worse than an absent one — it will be applied, and nobody approved it.
