---
name: harness-validate
description: Drive the app with Chrome DevTools/Playwright to validate changes visually. Implements the article's pattern of snapshot BEFORE, trigger UI path, observe runtime events, snapshot AFTER, apply fix, restart, loop until clean. Use when validating UI changes, reproducing bugs, or verifying fixes visually.
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Agent
argument-hint: [UI path or scenario to validate]
---

# Harness Validate (App Validation Loop)

Drive the application and validate changes visually using Chrome DevTools / Playwright.

Article: "We wired the Chrome DevTools Protocol into the agent runtime and created
skills for working with DOM snapshots, screenshots, and navigation. This enabled
Codex to reproduce bugs, validate fixes, and reason about UI behavior directly."

## What to Validate

$ARGUMENTS

## Prerequisites

Check if the app can be started locally:
- Dev server command: !`grep -m1 '"dev"' package.json 2>/dev/null | sed 's/.*: "//' | sed 's/".*//' || echo "not found"`
- Start script: !`grep -m1 '"start"' package.json 2>/dev/null | sed 's/.*: "//' | sed 's/".*//' || echo "not found"`
- App framework: !`grep -E '"next"|"react-scripts"|"vite"|"nuxt"' package.json 2>/dev/null | head -3 || echo "not detected"`

## Validation Loop

Repeat until the validation passes or max 3 rounds:

### Step 1: Start the App

Boot the application in a local dev server. If using a framework with hot reload,
the server may already be running. If not:

```bash
# Start dev server in background (adapt to project)
npm run dev &
# Wait for server to be ready
sleep 5
```

### Step 2: Snapshot BEFORE

If a Playwright MCP server is available:
- Navigate to the target URL
- Take a screenshot (snapshot BEFORE)
- Capture the DOM state / accessibility snapshot
- Record any console errors

If no Playwright MCP:
- Use `curl` to check the page loads
- Read the relevant component/page source code

### Step 3: Trigger UI Path

Navigate through the user journey or UI path being validated:
- Click through the relevant UI flow
- Fill in any form fields
- Trigger the specific interaction being tested

### Step 4: Observe Runtime Events

During the interaction, capture:
- Console errors and warnings
- Network request failures
- Unhandled exceptions
- Performance timing

### Step 5: Snapshot AFTER

- Take another screenshot (snapshot AFTER)
- Capture the DOM state after interaction
- Compare BEFORE vs AFTER

### Step 6: Evaluate

Check if the validation passes:
- Does the UI render correctly?
- Are there console errors?
- Does the user journey complete successfully?
- Does the visual state match expectations?

### Step 7: Fix or Approve

- If issues found → fix the code, restart the app, go to Step 2
- If clean → **VALIDATED. Exit loop.**
- If max rounds reached → report remaining issues

## Output

- Screenshots before/after (if Playwright available)
- Console errors captured
- Issues found and fixes applied per round
- Final verdict: **VALIDATED** or **NEEDS MANUAL CHECK**

## Video Recording

The article says agents "record a video demonstrating the failure" and "a second video
demonstrating the resolution." If Playwright is available:
- Use `browser_take_screenshot` for before/after snapshots
- For actual video, configure Playwright with `recordVideo: { dir: '.harness/videos/' }`
- Reference videos in PR descriptions as evidence of fix validation

## Note

This skill works best when a Playwright MCP server is configured in `.mcp.json`.
Without it, validation falls back to curl + source code analysis.
The article describes "app bootable per git worktree" — if the project supports
worktree-isolated instances, the validation runs on an isolated copy.
