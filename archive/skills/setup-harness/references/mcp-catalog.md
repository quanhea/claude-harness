# MCP Server Catalog

Maps infrastructure signals to recommended MCP servers.
Used by setup-harness to generate .mcp.json recommendations.

## Detection → MCP Recommendation

### Issue Tracking
| Signal | MCP Server | Install |
|--------|-----------|---------|
| `.linear/` or Linear URLs in docs | `mcp.linear.app` | Built-in to Claude Code |
| `.jira/` or Jira URLs | `mcp.atlassian.com` | Built-in |
| GitHub Issues in use | `github/github-mcp-server` | Built-in |
| Asana URLs | `mcp.asana.com` | Built-in |

### Infrastructure
| Signal | MCP Server | Install |
|--------|-----------|---------|
| `*.tf` files (Terraform) | Terraform MCP | `claude mcp add terraform` |
| `kubeconfig` or k8s manifests | Kubernetes MCP | `claude mcp add kubernetes` |
| AWS config (`~/.aws/`) | `awslabs/mcp` | `claude mcp add aws` |

### Monitoring
| Signal | MCP Server | Install |
|--------|-----------|---------|
| Datadog config or URLs | `mcp.datadoghq.com` | Built-in |
| Grafana URLs in docs | `grafana/mcp-grafana` | `claude mcp add grafana` |
| Sentry DSN in .env | `getsentry/sentry-mcp` | `claude mcp add sentry` |
| PagerDuty references | `PagerDuty/pagerduty-mcp-server` | `claude mcp add pagerduty` |

### Databases
| Signal | MCP Server | Install |
|--------|-----------|---------|
| PostgreSQL in docker-compose or .env | `@modelcontextprotocol/server-postgres` | `claude mcp add postgres` |
| MongoDB in docker-compose or .env | MongoDB MCP | `claude mcp add mongodb` |
| SQLite files | `@modelcontextprotocol/server-sqlite` | `claude mcp add sqlite` |

### Communication (HIDDEN — must ask user)
| Signal | MCP Server | Why hidden |
|--------|-----------|-----------|
| None detectable | Slack MCP | Decisions live in Slack but no signal in repo |
| None detectable | Notion MCP | Specs live in Notion but no signal in repo |
| None detectable | Google Drive MCP | Docs live in Drive but no signal in repo |
| None detectable | Gmail MCP | Context in email but no signal in repo |
| None detectable | Figma MCP | Designs live in Figma but no signal in repo |

### CI/CD (NO MCP — encode in repo)
| Signal | What to do |
|--------|-----------|
| `.github/workflows/` | Read workflows, encode deployment strategy in INFRASTRUCTURE.md |
| `.gitlab-ci.yml` | Read pipeline, encode in INFRASTRUCTURE.md |
| `Jenkinsfile` | Read pipeline, encode in INFRASTRUCTURE.md |
| `bitbucket-pipelines.yml` | Read pipeline, encode in INFRASTRUCTURE.md |
| `.circleci/config.yml` | Read pipeline, encode in INFRASTRUCTURE.md |

### Containers (NO MCP — encode in repo)
| Signal | What to do |
|--------|-----------|
| `Dockerfile` | Read and document build strategy in INFRASTRUCTURE.md |
| `docker-compose*.yml` | Read and document service topology in INFRASTRUCTURE.md |
| `Helm charts (chart.yaml)` | Read and document deployment strategy in INFRASTRUCTURE.md |
