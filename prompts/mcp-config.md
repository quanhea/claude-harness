---
description: Generate .mcp.json server recommendations
outputs: [".mcp.json{,.TEMPLATE,.EXAMPLE,.example,.sample}"]
---

# Task: Generate .mcp.json

**Output:** `{{PROJECT_DIR}}/.mcp.json`

You are generating the MCP (Model Context Protocol) server configuration for this project. This gives Claude access to project-specific tools — database queries, issue trackers, monitoring — without leaving the editor.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info and infrastructure (database, monitoring, issue tracker, CI) from codebase"
2. "Check for existing .mcp.json (merge, do not overwrite user entries)"
3. "Match detected infrastructure to available MCP servers"
4. "Generate .mcp.json with only relevant servers"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Infrastructure Detection

Scan the same sources as the worktree task — `.env*`, `docker-compose*.yml`, `package.json` deps, `pyproject.toml`, `go.mod`, source imports — to detect:

- **Database**: PostgreSQL, MySQL, SQLite, MongoDB
- **Issue tracker**: Linear, GitHub Issues, Jira
- **Monitoring**: Grafana, Datadog, Sentry, New Relic
- **Communication**: Slack
- **CI/CD**: GitHub Actions

## Finding MCP Servers

For each detected service (database, issue tracker, monitoring, etc.), **search the web** for its MCP server installation guide. MCP servers change frequently — do not guess package names or URLs from memory.

Search queries to use:
- `"mcp server <service-name> install"` (e.g. `"mcp server grafana install"`)
- `"<service-name> mcp claude code"` (e.g. `"linear mcp claude code"`)
- Check `github.com/modelcontextprotocol/servers` for the official registry

From the search results, get the **exact** package name, command, args, and env vars. Prefer HTTP remote servers (no local process) over stdio when both are available. Do not include a server unless the search confirms it exists.

## `.mcp.json` Format

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@some/package"],
      "env": { "API_KEY": "${API_KEY}" }
    },
    "remote-server": {
      "type": "http",
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer ${TOKEN}" }
    }
  }
}
```

Two transport types:
- **stdio** (default): local process, `command` + `args` + optional `env`
- **http**: remote server, `type: "http"` + `url` + optional `headers`

## Rules

- NEVER hardcode credentials or secrets in .mcp.json — use `${ENV_VAR}` references.
- Only include MCP servers for infrastructure that ACTUALLY EXISTS in this project.
- If no relevant infrastructure is detected, write an empty `mcpServers: {}`.
- If .mcp.json already exists, read it first and MERGE — preserve user-configured servers.
- If `.mcp.json` contains any `${ENV_VAR}` references, add it to `.gitignore` AND write a tracked companion file `.mcp.json.<SUFFIX>` with the same structure (matching the project's existing convention — look for `.env.TEMPLATE`, `.env.EXAMPLE`, `.env.example`, `.env.sample`; default to `.example` if none found).
