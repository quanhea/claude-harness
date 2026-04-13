# Task: Generate CI harness validation workflow

**Output:** `{{PROJECT_DIR}}/.github/workflows/harness-validate.yml`

You are adding a CI job that validates the harness knowledge base on every PR — checks required files exist, CLAUDE.md is under 100 lines, and no broken markdown links in docs/.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent)"
2. "Detect CI platform (.github/workflows/ = GitHub Actions, .gitlab-ci.yml = GitLab)"
3. "Check if harness-validate workflow already exists (do not overwrite)"
4. "Write CI validation workflow following the detected platform format"
5. "Verify workflow does not overwrite existing workflows — adds as new file/job only"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## GitHub Actions Output

If `.github/workflows/` directory exists (or no CI detected — default to GitHub Actions):

```yaml
name: Harness Validation

on:
  pull_request:
    branches: [main, master, staging]
  push:
    branches: [main, master]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate knowledge base
        run: |
          # Check required harness files exist
          test -f CLAUDE.md || { echo "❌ Missing CLAUDE.md"; exit 1; }
          test -f ARCHITECTURE.md || { echo "❌ Missing ARCHITECTURE.md"; exit 1; }
          test -f docs/QUALITY_SCORE.md || { echo "❌ Missing docs/QUALITY_SCORE.md"; exit 1; }

          # Check CLAUDE.md is under 100 lines
          lines=$(wc -l < CLAUDE.md)
          if [ "$lines" -gt 100 ]; then
            echo "❌ CLAUDE.md is $lines lines (max 100)"
            exit 1
          fi

          # Check for broken markdown links in docs/
          broken=0
          for md in $(find docs -name "*.md" 2>/dev/null); do
            while IFS= read -r link; do
              [ -z "$link" ] && continue
              case "$link" in http*|#*|/*) continue ;; esac
              dir=$(dirname "$md")
              target="$dir/$link"
              if [ ! -f "$target" ] && [ ! -d "$target" ]; then
                echo "❌ Broken link in $md: $link"
                broken=$((broken + 1))
              fi
            done < <(grep -oE '\]\([^)]+\)' "$md" 2>/dev/null | sed 's/\](\(.*\))/\1/' | sed 's/#.*//')
          done
          if [ "$broken" -gt 0 ]; then
            echo "❌ $broken broken links found"
            exit 1
          fi

          echo "✅ Harness validation passed"

      - name: Check file sizes (warning only)
        continue-on-error: true
        run: |
          oversized=$(find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) \
            -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" \
            -not -name "*.test.*" -not -name "*.spec.*" \
            -exec sh -c 'test $(wc -l < "$1") -gt 300 && echo "$1: $(wc -l < "$1") lines"' _ {} \;)
          if [ -n "$oversized" ]; then
            echo "⚠️ Files over 300 lines:"
            echo "$oversized"
          fi
```

## GitLab CI Output

If `.gitlab-ci.yml` exists, APPEND this job (do not replace the file):

```yaml
harness-validate:
  stage: test
  script:
    - test -f CLAUDE.md || { echo "❌ Missing CLAUDE.md"; exit 1; }
    - test -f ARCHITECTURE.md || { echo "❌ Missing ARCHITECTURE.md"; exit 1; }
    - |
      lines=$(wc -l < CLAUDE.md)
      if [ "$lines" -gt 100 ]; then
        echo "❌ CLAUDE.md is $lines lines (max 100)"
        exit 1
      fi
    - echo "✅ Harness validation passed"
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

## Rules

- NEVER overwrite existing CI workflow files. Add as a new file or append a new job.
- If `.github/workflows/harness-validate.yml` already exists, skip this task.
- Default to GitHub Actions if no CI is detected.
- The file size check must use `continue-on-error: true` — it is a warning, not a blocker.
