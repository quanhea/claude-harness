---
description: Generate .mcp.json server recommendations
outputs: [".mcp.json{,.TEMPLATE,.EXAMPLE,.example,.sample}"]
---

# Task: Generate .mcp.json

**Output:** `{{PROJECT_DIR}}/.mcp.json`

You are generating the MCP (Model Context Protocol) server configuration for this project. This gives Claude access to project-specific tools — database queries, API clients, monitoring queries — without leaving the editor.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Detect infrastructure that benefits from MCP (database, monitoring, GitHub, Slack)"
3. "Check for existing .mcp.json (merge, do not overwrite user entries)"
4. "Generate .mcp.json with servers appropriate for this project"
5. "Verify all mcpServers entries have accurate command/args for this project"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Which MCP Servers to Include

Only include servers relevant to the detected infrastructure:

### Always available
```json
{
  "mcpServers": {}
}
```

Start empty. Add only what's relevant.

### If infrastructure includes PostgreSQL
```json
"postgres": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres", "{{DATABASE_URL}}"],
  "description": "Query the {{projectName}} database directly"
}
```
Use `${DATABASE_URL}` env var reference, not hardcoded credentials.

### If infrastructure includes GitHub Actions or CI
```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  },
  "description": "Access GitHub PRs, issues, and CI runs"
}
```

### If infrastructure includes filesystem tools
```json
"filesystem": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "{{PROJECT_DIR}}"],
  "description": "File access within project directory"
}
```

### If infrastructure includes a SQLite database
```json
"sqlite": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sqlite", "{{path-to-db-file}}"],
  "description": "Query the {{projectName}} SQLite database"
}
```

## Template

```json
{
  "mcpServers": {
    {{only include servers for detected infrastructure}}
  }
}
```

## Rules

- NEVER hardcode credentials or secrets in .mcp.json — use `${ENV_VAR}` references.
- Only include MCP servers for infrastructure that ACTUALLY EXISTS in this project.
- If no relevant infrastructure is detected, write an empty `mcpServers: {}`.
- If .mcp.json already exists, read it first and MERGE — preserve user-configured servers.
- If `.mcp.json` contains any `${ENV_VAR}` references, add it to `.gitignore` AND write a tracked companion file `.mcp.json.<SUFFIX>` with the same structure (matching the project's existing convention — look for `.env.TEMPLATE`, `.env.EXAMPLE`, `.env.example`, `.env.sample`; default to `.example` if none found).
