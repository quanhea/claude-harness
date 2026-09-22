---
description: Generate CI workflow — harness validation + agent build triage
outputs: [".github/workflows/harness-validate.yml"]
---

# Task: Generate CI harness validation workflow

**Output:** `{{PROJECT_DIR}}/.github/workflows/harness-validate.yml`

You are adding two things to CI:

1. **Harness validation** — the knowledge base stays true on every PR: required files exist, CLAUDE.md is under its line budget, no broken links in docs/.
2. **Build triage** — when a build fails, a non-interactive Claude run reads the log and posts a short judgment: likely cause, and whether it looks flaky or real. This is the read-only end of agents in the pipeline, where a wrong answer costs a comment rather than a deploy.

Triage is judgment work that pipelines traditionally hand to a human at the worst moment. It reads the log and writes a summary; it changes nothing.

## Your Tasks

Create these tasks now with TaskCreate:

1. "Detect project info (language, framework, commands) from the project manifest (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent). If the root has no manifest but its immediate subdirectories do, this is an umbrella repo: detect each sub-project separately and treat the root as the cross-cutting layer"
2. "Detect CI platform (.github/workflows/ = GitHub Actions, .gitlab-ci.yml = GitLab)"
3. "Check if harness-validate workflow already exists (do not overwrite)"
4. "Check whether an ANTHROPIC_API_KEY secret is plausibly available (referenced in any existing workflow); if not, generate the triage job but leave it commented out with a one-line note on what to set"
5. "Write CI validation workflow following the detected platform format"
6. "Verify workflow does not overwrite existing workflows — adds as new file/job only"

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

      - name: Triage the failure
        if: failure()
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        continue-on-error: true
        run: |
          npm install -g @anthropic-ai/claude-code
          claude -p "Read the validation output above and the repo's CLAUDE.md. \
            Identify the most likely cause of this failure, say whether it looks \
            like a real problem or a flake, and write a three-line summary for \
            the PR thread. Do not change any files." \
            --allowedTools "Read,Grep,Glob" \
            >> "$GITHUB_STEP_SUMMARY"

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
- The triage step is `if: failure()` and `continue-on-error: true`. A triage step that can itself fail the build turns a helpful summary into a second outage.
- Triage runs **read-only** — `--allowedTools "Read,Grep,Glob"`, no Edit, no Bash. An agent that can fix the build in CI is an agent pushing unreviewed code to a branch.
- If no `ANTHROPIC_API_KEY` is plausibly configured, emit the triage job commented out, with one line saying which secret to set. A job that fails on every run because a secret is missing gets deleted, and the validation job goes with it.
- The eval suite is a separate workflow owned by the `evals` task — do not add eval steps here.
