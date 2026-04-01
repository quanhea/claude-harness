---
name: harness-capture
description: Encode external knowledge (Slack decisions, Google Doc specs, meeting notes, tacit knowledge) into repository markdown. Use when the user shares context that should be preserved for agents, or says "remember this", "capture this decision", "encode this", or "this should be in the repo".
allowed-tools: Read, Glob, Grep, Write, Edit, WebFetch
argument-hint: <paste the knowledge to capture, or describe what to encode>
---

# Harness Capture

Encode external knowledge into repository markdown so agents can see it.

Article: "From the agent's point of view, anything it can't access in-context
while running effectively doesn't exist. Knowledge that lives in Google Docs,
chat threads, or people's heads are not accessible to the system."

## What to Capture

$ARGUMENTS

## Knowledge Types

Determine which type of knowledge this is and file it accordingly:

### Design Decision
→ Create or update a file in `docs/design-docs/`
- Format as a decision record: context, decision, consequences
- Add to `docs/design-docs/index.md`

### Product Specification
→ Create or update a file in `docs/product-specs/`
- Format as a spec: what, why, acceptance criteria
- Add to `docs/product-specs/index.md`

### Architecture Decision
→ Update `docs/ARCHITECTURE.md`
- Add to the relevant section (domains, layers, conventions)
- If it changes dependency rules, update `.claude/rules/architecture.md` too

### Operating Principle / Core Belief
→ Update `docs/design-docs/core-beliefs.md`
- Add as a new numbered belief
- Include the "why" — reasoning matters for agent judgment

### Security or Compliance Requirement
→ Update `docs/SECURITY.md`
- Add to the relevant section
- If it's an enforcement rule, add to `.claude/rules/`

### Reliability Requirement (SLA/SLO)
→ Update `docs/RELIABILITY.md`
- Add specific targets to the SLA/SLO table

### Product Context / Domain Knowledge
→ Update `docs/PRODUCT_SENSE.md`
- Add domain terms to the glossary
- Update user journeys if they changed

### External API or Library Reference
→ Add to `docs/references/`
- If it's library docs, save as `<name>-llms.txt`
- If it's API docs, save as `<name>-api.md`

### Planning / Roadmap Decision
→ Update `docs/PLANS.md` or create an exec plan in `docs/exec-plans/active/`

### Anything Else
→ Determine the most relevant doc and add it there
→ If no existing doc fits, create a new one in `docs/` and add it to CLAUDE.md's knowledge table

## Process

1. Read the knowledge provided in $ARGUMENTS
2. Determine the type (see above)
3. Read the target file to understand current content
4. Add the new knowledge in the appropriate section
5. If creating a new file, add it to the relevant index
6. Verify the knowledge is now discoverable from CLAUDE.md (via pointers)

## Format Guidelines

- Be specific and mechanical — agents can't interpret vague prose
- Include the **source** (who said it, when, where) for traceability
- Include the **reasoning** (why this decision was made) for agent judgment
- Use structured formats: tables, lists, decision records
- Don't duplicate — link to existing docs where possible

## Output

- Which file was updated or created
- What was added (summary)
- How it's discoverable from CLAUDE.md
