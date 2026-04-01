---
name: harness-plan
description: Create a structured execution plan for a complex task. Use when starting work that needs decomposition into steps, when planning a feature, or when the user says "plan this", "break this down", or "create an exec plan".
allowed-tools: Read, Glob, Grep, Write
argument-hint: <description of the task to plan>
---

# Harness Plan

Create a structured execution plan for: $ARGUMENTS

## Context

- Architecture: read `docs/ARCHITECTURE.md`
- Quality grades: read `docs/QUALITY.md`
- Active plans: !`ls docs/exec-plans/active/ 2>/dev/null || echo "no active plans"`
- Recent changes: !`git log --oneline -5 2>/dev/null || echo "no git history"`

## Process

### 1. Understand the Task

- What is being asked?
- Which domains/modules does this touch?
- What are the dependencies and risks?

### 2. Check Existing Plans

Read `docs/exec-plans/active/` for related active plans. Don't duplicate work.

### 3. Decompose into Steps

Break the task into steps that are:
- **Small enough** for a single PR each
- **Independently verifiable** — each step can be tested in isolation
- **Ordered by dependency** — earlier steps unlock later ones

### 4. Write the Plan

Create a new file at `docs/exec-plans/active/<slug>.md`:

```markdown
# Plan: <title>

**Status**: 🟡 Active
**Created**: <today's date>

## Goal

<1-2 sentences on what this achieves and why>

## Context

<What exists today, what problem this solves, what constraints exist>

## Steps

- [ ] Step 1: <specific action>
  - **Files**: <which files to create/modify>
  - **Validates**: <how to verify this step is done>
  - **Risk**: <what could go wrong>
- [ ] Step 2: ...
- [ ] Step 3: ...

## Dependencies

<What must be true before starting — other plans, external requirements>

## Validation

<How to verify the entire plan is done correctly>

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| <today> | Created plan | <why this approach was chosen> |
```

### 5. Report

Summarize:
- What the plan covers
- How many steps
- Key risks
- Suggest starting with Step 1
