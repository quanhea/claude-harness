# Task: Generate docs/OBSERVABILITY.md

**Output:** `{{PROJECT_DIR}}/docs/OBSERVABILITY.md`

**Skip if not an app.** If `package.json` has no `scripts.start`/`scripts.dev` and there is no `main.py`/`manage.py`/`main.go`/`Dockerfile`, write a one-line stub `# Observability (N/A — not an app)` and exit.

You are creating docs/OBSERVABILITY.md — the logging, metrics, and tracing setup for this application.
Only generated for applications (isApp: true), not libraries.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Detect existing logging library and patterns (grep for logger/console/print calls)"
3. "Detect existing metrics or tracing setup (OpenTelemetry, Datadog, Sentry, etc.)"
4. "Check for docker-compose files or observability infrastructure"
5. "Check for existing docs/OBSERVABILITY.md (merge if present)"
6. "Write docs/OBSERVABILITY.md following the exact template"
7. "Verify all tools and patterns reference actual code or config found"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Template

```markdown
# Observability

Updated: {{today's date}}

## Logging

**Library:** {{discovered — e.g. winston, pino, structlog, slog, zerolog, or "console.log (no structured logger)"}}
**Format:** {{JSON structured / plaintext}}
**Level control:** {{e.g. "LOG_LEVEL env var", "hardcoded INFO", "not configured"}}

**Pattern:**

```{{language}}
{{actual example of a log call from the codebase}}
```

## Metrics

**Tool:** {{e.g. Prometheus + prom-client, Datadog, OpenTelemetry, or "none configured"}}
**Endpoint:** {{e.g. "GET /metrics (Prometheus format)", "or none"}}

## Tracing

**Tool:** {{e.g. OpenTelemetry, Jaeger, Datadog APM, or "none configured"}}
**Instrumentation:** {{e.g. "HTTP requests auto-instrumented via @opentelemetry/auto-instrumentations-node"}}

## Local Observability Stack

{{If docker-compose.observability.yml exists:}}
```bash
docker compose -f docker-compose.observability.yml up -d
```
Starts: Vector (log collector), Victoria Logs (LogQL), Victoria Metrics (PromQL)

{{If no local stack:}}
For local debugging, use structured JSON logs:
```bash
{{run command}} 2>&1 | tee /tmp/app-logs.jsonl
```

## Querying Logs

{{If Victoria Logs configured:}}
```bash
# Recent errors
curl -s 'http://localhost:9428/select/logsql/query?query=level:error&limit=20'
```

{{If file-based:}}
```bash
# Recent errors
grep '"level":"error"' /tmp/app-logs.jsonl | tail -20
```

## Alerting

**Monitoring:** {{e.g. "Datadog monitors", "PagerDuty", "GitHub Actions + Slack", or "none configured"}}
**On-call process:** See [docs/RELIABILITY.md](docs/RELIABILITY.md)
```

## Rules

- Only document what's actually configured. Do not prescribe tools not yet in use.
- If no observability is configured, write "No observability configured — structured logging recommended."
- Log examples must come from actual source files, not invented examples.
