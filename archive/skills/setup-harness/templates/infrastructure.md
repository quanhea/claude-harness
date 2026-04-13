# Template: Infrastructure Legibility

> Article: "From the agent's point of view, anything it can't access in-context
> while running effectively doesn't exist."
>
> This template makes ALL project infrastructure legible to the agent:
> 1. Generate INFRASTRUCTURE.md documenting what exists
> 2. Generate .mcp.json recommending MCP servers for external systems
> 3. Flag hidden knowledge sources the user needs to set up

---

## File: INFRASTRUCTURE.md

```markdown
# Infrastructure

> Infrastructure map for {{project-name}}.
> What runs where, how it's deployed, and how to access it.

## Services

{{for-each-service-in-docker-compose-or-detected:}}
| Service | Type | Port | Description |
|---------|------|------|-------------|
| {{service}} | {{type}} | {{port}} | {{description}} |

## CI/CD

{{read-.github/workflows/-or-.gitlab-ci.yml-and-summarize:}}

- **Platform**: {{GitHub Actions / GitLab CI / Jenkins / etc.}}
- **Trigger**: {{on push to main / on PR / manual}}
- **Steps**: {{build → test → deploy}}
- **Environments**: {{staging, production}}
- **Secrets**: {{list secret names, NOT values}}

## Cloud Infrastructure

{{if-terraform-files-exist:}}
### Terraform
- **State**: {{local / S3 / Terraform Cloud}}
- **Workspaces**: {{list workspaces}}
- **Key resources**: {{list main resources}}

{{if-k8s-manifests-exist:}}
### Kubernetes
- **Cluster**: {{cluster name/provider}}
- **Namespaces**: {{list namespaces}}
- **Key deployments**: {{list deployments}}

{{if-aws-config:}}
### AWS
- **Region**: {{primary region}}
- **Key services**: {{list: ECS, Lambda, RDS, S3, etc.}}

## Databases

| Database | Type | Location | Access |
|----------|------|----------|--------|
| {{name}} | {{PostgreSQL/MySQL/MongoDB/etc.}} | {{local/RDS/Atlas/etc.}} | {{connection string pattern, NO credentials}} |

## Deployment

- **How to deploy**: {{command or process}}
- **Rollback procedure**: {{how to rollback}}
- **Health checks**: {{URL or command to verify}}

## Monitoring

| System | URL | What it monitors |
|--------|-----|-----------------|
| {{Datadog/Grafana/Sentry/etc.}} | {{URL}} | {{metrics/logs/errors}} |

## External Integrations

{{list-all-external-services-the-app-talks-to:}}
| Integration | Purpose | Auth Method |
|-------------|---------|-------------|
| {{Stripe/Twilio/SendGrid/etc.}} | {{payments/SMS/email}} | {{API key in env}} |
```

---

## File: .mcp.json (recommended MCP servers)

Generate a `.mcp.json` with MCP servers based on detected infrastructure.
Only include servers for systems that ACTUALLY exist in the project.

```json
{
  {{if-github-repo:}}
  "github": {
    "command": "gh",
    "args": ["mcp"]
  },

  {{if-postgresql-detected:}}
  "postgres": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres", "{{DATABASE_URL}}"]
  },

  {{if-terraform-detected:}}
  "terraform": {
    "command": "npx",
    "args": ["-y", "terraform-mcp-server"]
  },

  {{if-playwright-or-frontend:}}
  "playwright": {
    "command": "npx",
    "args": ["-y", "@anthropic-ai/mcp-server-playwright"]
  }
}
```

---

## Output: MCP Setup Checklist (print to user)

After generating all files, print this checklist to the user. Group into
"Auto-detected" (can set up now) and "Ask the user" (hidden sources).

```markdown
## MCP Setup Checklist for {{project-name}}

### Auto-detected (recommended to add)

{{for-each-detected-system-with-mcp:}}
- [ ] **{{system}}** — `claude mcp add {{server-name}}`
  Detected: {{what-signal-was-found}}

### Hidden Sources (ask the user)

These tools store knowledge that agents can't see. If your team uses any
of these, setting up the MCP server makes that knowledge legible:

- [ ] **Slack** — Team discussions, architectural decisions, incident threads
  `claude mcp add slack` — requires Slack bot token
- [ ] **Notion** — Product specs, meeting notes, knowledge base
  `claude mcp add notion` — requires Notion API key
- [ ] **Google Drive** — Shared documents, spreadsheets, presentations
  `claude mcp add gdrive` — requires Google OAuth
- [ ] **Figma** — Design files, component specs, UI mockups
  `claude mcp add figma` — requires Figma access token
- [ ] **Jira** — If using Jira instead of Linear/GitHub Issues
  `claude mcp add jira` — requires Atlassian API token

### No MCP Available (encoded in repo instead)

{{for-each-detected-system-without-mcp:}}
- [x] **{{system}}** — documented in `INFRASTRUCTURE.md`
  {{what-was-encoded: CI/CD pipeline, Docker topology, Helm charts, etc.}}
```

---

## Adaptation Instructions

1. **Scan the project** for infrastructure files BEFORE generating:
   - `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`
   - `Dockerfile`, `docker-compose*.yml`
   - `*.tf`, `*.tfvars`
   - `k8s/`, `helm/`, `charts/`, any `.yaml` with `apiVersion:`
   - `.env` for DATABASE_URL, SENTRY_DSN, DATADOG_API_KEY, etc.
   - `package.json` for framework-specific integrations
2. **Read detected IaC/CI files** and summarize them in INFRASTRUCTURE.md
3. Only add MCP entries to `.mcp.json` for systems that ACTUALLY exist
4. Always print the hidden sources checklist — the user decides which to set up
5. If `.mcp.json` already exists, MERGE — don't overwrite existing entries
