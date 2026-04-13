# Task: Generate docs/INFRASTRUCTURE.md

**Output:** `{{PROJECT_DIR}}/docs/INFRASTRUCTURE.md`

You are documenting the real infrastructure this project depends on — discovered from actual config files.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Read Dockerfile and docker-compose files if present"
3. "Read CI/CD workflow files (.github/workflows/, .gitlab-ci.yml)"
4. "Read infrastructure-as-code files (*.tf, k8s/, helm/)"
5. "Detect environment variables and secrets (from .env.example, README)"
6. "Write docs/INFRASTRUCTURE.md following the exact template"
7. "Verify all sections reflect real files found (no invented details)"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Context

```bash
ls Dockerfile docker-compose*.yml 2>/dev/null
ls .github/workflows/*.yml 2>/dev/null
ls k8s/ helm/ charts/ terraform/ infra/ 2>/dev/null
cat .env.example 2>/dev/null || cat .env.sample 2>/dev/null
```

## Template

```markdown
# Infrastructure

## Services

| Service | Purpose | Config |
|---------|---------|--------|
{{e.g.: | PostgreSQL 15 | Primary database | docker-compose.yml |}}
{{e.g.: | Redis 7 | Cache and session store | docker-compose.yml |}}

## CI/CD

**Platform:** {{GitHub Actions / GitLab CI / CircleCI / Jenkins / none}}

**Workflows:**
{{List each workflow file and what it does:
- `.github/workflows/ci.yml` — runs tests on every PR
- `.github/workflows/deploy.yml` — deploys to production on main merge}}

## Environments

| Environment | URL | Deployment trigger |
|-------------|-----|--------------------|
{{e.g.: | production | https://app.example.com | Merge to main |}}
{{e.g.: | staging | https://staging.example.com | Merge to staging branch |}}

## Local Development

```bash
# Start all services
{{docker-compose up -d or equivalent}}

# Run the app
{{build/run command from discovery}}
```

## Environment Variables

Key variables (see `.env.example` for full list):

| Variable | Purpose | Required |
|----------|---------|----------|
{{e.g.: | DATABASE_URL | PostgreSQL connection string | Yes |}}
{{e.g.: | REDIS_URL | Redis connection string | Yes |}}
{{e.g.: | API_KEY | External service auth | Yes |}}

## Secrets Management

{{How secrets are stored and accessed: Vault, AWS Secrets Manager, GitHub Secrets, .env file, etc.}}
```

## Rules

- Only document what exists in actual files. Do not invent services.
- If Dockerfile is missing, write "Containerization: Not configured."
- If no CI is detected, write "CI/CD: Not configured."
