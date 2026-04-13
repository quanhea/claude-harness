# Task: Generate docs/SECURITY.md

**Output:** `{{PROJECT_DIR}}/docs/SECURITY.md`

You are creating docs/SECURITY.md — the threat model, auth mechanisms, and secrets management approach for this project.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Check for auth-related files (middleware, auth/, jwt, oauth, session)"
3. "Check for secrets management (env vars, vault, secrets manager)"
4. "Check for input validation patterns in source code"
5. "Check for HTTPS/TLS configuration"
6. "Write docs/SECURITY.md following the exact template"
7. "Verify all sections reference actual files or patterns found"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Template

```markdown
# Security

Updated: {{today's date}}

## Authentication & Authorization

**Mechanism:** {{e.g. JWT, session cookies, OAuth 2.0, API keys, none}}
**Implementation:** {{e.g. "src/middleware/auth.ts handles JWT verification"}}

| Role | Permissions |
|------|-------------|
| {{role}} | {{what they can do}} |

## Secrets Management

**Approach:** {{e.g. ".env files (dev), environment variables (prod)", "AWS Secrets Manager", "Vault"}}

**Never commit:**
- API keys
- Database passwords
- JWT secrets
- OAuth client secrets

**Secrets in use:** See `.env.example` for required variables.

## Input Validation

**Where validated:** {{e.g. "All user input validated at HTTP handler layer in src/api/"}}
**Library:** {{e.g. zod, joi, pydantic, none detected}}

## Threat Model

| Threat | Likelihood | Mitigation |
|--------|-----------|------------|
| SQL injection | {{Med/Low/High}} | {{e.g. "Parameterized queries via ORM"}} |
| XSS | {{likelihood}} | {{mitigation}} |
| CSRF | {{likelihood}} | {{mitigation}} |
| Dependency vulnerabilities | Medium | `npm audit` / `pip-audit` in CI |
| Secrets exposure | Medium | `.env` in `.gitignore`, secrets not logged |

## Security Checklist

- [ ] All endpoints require authentication (or have explicit public route list)
- [ ] Input validated at boundaries
- [ ] Secrets not hardcoded in source
- [ ] Dependencies audited in CI
- [ ] HTTPS enforced in production
- [ ] Error messages don't expose stack traces to users

## Reporting Vulnerabilities

{{If public project: "Report security issues to [email]. Do not open public GitHub issues for security vulnerabilities."}}
{{If private: "Report security issues to the security team via [channel/email]."}}
```

## Rules

- Document REAL auth mechanisms found in code. Do not invent security features that don't exist.
- If no auth is found, write "No authentication implemented — all endpoints are public."
- Mark checklist items as unchecked `[ ]` unless you have evidence they're done.
