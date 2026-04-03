# Template: CI Job for Harness Validation

> Article: "Dedicated linters and CI jobs validate that the knowledge base is
> up to date, cross-linked, and structured correctly."
> Generate a CI workflow that runs harness validation on every PR.

---

## Variant: GitHub Actions

### File: .github/workflows/harness-validate.yml

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
          test -f .claude/CLAUDE.md || { echo "❌ Missing .claude/CLAUDE.md"; exit 1; }
          test -f ARCHITECTURE.md || { echo "❌ Missing ARCHITECTURE.md"; exit 1; }
          test -f docs/QUALITY_SCORE.md || { echo "❌ Missing docs/QUALITY_SCORE.md"; exit 1; }

          # Check CLAUDE.md is under 100 lines
          lines=$(wc -l < .claude/CLAUDE.md)
          if [ "$lines" -gt 100 ]; then
            echo "❌ .claude/CLAUDE.md is $lines lines (max 100)"
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

      - name: Check architecture (optional)
        continue-on-error: true
        run: |
          # Check for files over 300 lines
          oversized=$(find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) \
            -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" \
            -not -name "*.test.*" -not -name "*.spec.*" \
            -exec sh -c 'test $(wc -l < "$1") -gt 300 && echo "$1: $(wc -l < "$1") lines"' _ {} \;)
          if [ -n "$oversized" ]; then
            echo "⚠️ Files over 300 lines:"
            echo "$oversized"
          fi
```

---

## Variant: GitLab CI

### Append to .gitlab-ci.yml

```yaml
harness-validate:
  stage: test
  script:
    - test -f .claude/CLAUDE.md || { echo "❌ Missing .claude/CLAUDE.md"; exit 1; }
    - test -f ARCHITECTURE.md || { echo "❌ Missing ARCHITECTURE.md"; exit 1; }
    - |
      lines=$(wc -l < .claude/CLAUDE.md)
      if [ "$lines" -gt 100 ]; then
        echo "❌ .claude/CLAUDE.md is $lines lines (max 100)"
        exit 1
      fi
    - echo "✅ Harness validation passed"
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

---

## Adaptation Instructions

1. Detect CI platform: `.github/workflows/` → GitHub Actions, `.gitlab-ci.yml` → GitLab
2. If GitHub Actions: create `.github/workflows/harness-validate.yml`
3. If GitLab CI: append the job to existing `.gitlab-ci.yml`
4. If neither exists, default to GitHub Actions (most common)
5. Do NOT overwrite existing CI workflows — add as a new file/job
6. The workflow runs the same checks as `validate-docs.sh` but in CI
