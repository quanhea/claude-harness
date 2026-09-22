---
name: generate-skills
description: Generate a Claude Code skill (SKILL.md) from user requirements — either directly from detailed specs or by researching skillsmp.com for inspiration
allowed-tools: Read, Edit, Write, Bash(\*), Glob, Grep, mcp*
---

Generate a new skill based on the user's requirements.

## Steps

### 1. Detailed requirement — generate directly

If the user provides highly detailed requirements, keep their exact wording and generate a correctly formatted SKILL.md only.

### 2. Vague requirement — research and compose

If the user's requirement is short, vague, or lacks detail:

1. Search skillsmp.com for relevant skills (see `skillsmp-api.md`). Try in this order:
   - If a browser MCP (Playwright, Puppeteer, etc.) is available: navigate to skillsmp.com, use the search box to search, and read the results from the page
   - If no browser MCP: check if a headless browser is installed on the machine (chromium, chrome, playwright, puppeteer, selenium) and script it to navigate to skillsmp.com, search, and read the results
   - If nothing found, ask the user:
     > To search skillsmp.com I need a browser but none was found on this machine. Could you install a browser MCP by following https://code.claude.com/docs/en/mcp, e.g. https://github.com/microsoft/playwright-mcp
     > Then restart Claude Code and re-run this skill.
     Wait for user reply.
2. Propose a list of relevant skills to the user
3. Discuss pros and cons of each, recommend which to pick — can also choose a hybrid by mixing the best of each
4. Wait for user response
5. Fetch, explore, and read all related files of the selected skill(s), then compose a new one

### 3. Ask where to place the skill

Ask the user which path to place the skill at. Default to the current project's `.claude/skills/` directory.
