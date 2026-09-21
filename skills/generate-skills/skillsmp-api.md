# SkillsMP API

> API for [skillsmp.com](https://skillsmp.com) — Agent Skills Marketplace.

**Base URL:** `https://skillsmp.com`

---

## Public API v1 (requires API key)

All endpoints require: `Authorization: Bearer sk_live_your_api_key`

Generate an API key at [skillsmp.com/auth/login](https://skillsmp.com/auth/login).

### GET /api/v1/skills/search

Keyword search. Works with curl.

| Parameter | Type   | Required | Description                        |
|-----------|--------|----------|------------------------------------|
| `q`       | string | Yes      | Search query                       |
| `page`    | number | No       | Page number (default: 1)           |
| `limit`   | number | No       | Items per page (default: 20, max: 100) |
| `sortBy`  | string | No       | Sort: `stars` \| `recent`          |

```bash
curl "https://skillsmp.com/api/v1/skills/search?q=code+review&limit=20&sortBy=stars" \
  -H "Authorization: Bearer sk_live_your_api_key"
```

### GET /api/v1/skills/ai-search

AI semantic search (Cloudflare AI). Returns results by meaning, not exact keywords.

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| `q`       | string | Yes      | AI search query |

```bash
curl "https://skillsmp.com/api/v1/skills/ai-search?q=How+to+create+a+web+scraper" \
  -H "Authorization: Bearer sk_live_your_api_key"
```

### Rate limits

- 500 requests/day per API key (resets midnight UTC)
- Headers: `X-RateLimit-Daily-Limit`, `X-RateLimit-Daily-Remaining`

---

## Internal API (no auth, browser-only)

### GET /api/skills

Used by the skillsmp.com frontend. No auth needed but Cloudflare-protected — only works from a browser context (Playwright `browser_evaluate`), not from curl.

| Parameter | Type   | Default  | Description                     |
|-----------|--------|----------|---------------------------------|
| `search`  | string | `""`     | Keyword search query            |
| `page`    | number | `1`      | Page number                     |
| `limit`   | number | `12`     | Items per page                  |
| `sortBy`  | string | `stars`  | Sort: `stars` \| `recent`       |

---

## Response format

```json
{
  "skills": [
    {
      "id": "openclaw-openclaw-skills-github-skill-md",
      "name": "github",
      "author": "openclaw",
      "authorAvatar": "https://avatars.githubusercontent.com/u/252820863?v=4",
      "description": "GitHub operations via gh CLI...",
      "githubUrl": "https://github.com/openclaw/openclaw/tree/main/skills/github",
      "stars": 318425,
      "forks": 61069,
      "updatedAt": "1773720079",
      "path": "SKILL.md",
      "branch": "main"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 5000,
    "totalPages": 5000,
    "hasNext": true,
    "hasPrev": false,
    "totalIsExact": true
  },
  "filters": {
    "search": "",
    "sortBy": "stars"
  }
}
```

---

## Errors

```json
{
  "success": false,
  "error": {
    "code": "MISSING_API_KEY",
    "message": "Authorization header is required. Use: Authorization: Bearer sk_live_xxx"
  }
}
```

| Code                  | HTTP | Description                    |
|-----------------------|------|--------------------------------|
| `MISSING_API_KEY`     | 401  | API key not provided           |
| `INVALID_API_KEY`     | 401  | Invalid API key                |
| `MISSING_QUERY`       | 400  | Missing required `q` parameter |
| `DAILY_QUOTA_EXCEEDED`| 429  | Daily quota exceeded           |
| `INTERNAL_ERROR`      | 500  | Internal server error          |
