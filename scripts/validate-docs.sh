#!/usr/bin/env bash
# Lint: Knowledge base validation
# Article: "Dedicated linters and CI jobs validate that the knowledge base
# is up to date, cross-linked, and structured correctly."
# Rule: docs/ must have correct structure, valid cross-links, no broken references.
# This script is meant to be run as a skill or CI check, not a PostToolUse hook.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

ROOT="${1:-.}"
ISSUES=""
ISSUE_COUNT=0

# 1. Check required files exist
check_required() {
  local file="$1"
  local desc="$2"
  if [ ! -f "$ROOT/$file" ]; then
    ISSUES="${ISSUES}\n❌ Missing: $file ($desc)"
    ISSUE_COUNT=$((ISSUE_COUNT + 1))
  fi
}

check_required ".claude/CLAUDE.md" "Table of contents"
check_required "ARCHITECTURE.md" "Architecture map"
check_required "docs/QUALITY.md" "Quality grades"
check_required "docs/design-docs/index.md" "Design docs index"
check_required "docs/product-specs/index.md" "Product specs index"
check_required "docs/references/index.md" "References index"

# 2. Check CLAUDE.md is under 100 lines
if [ -f "$ROOT/.claude/CLAUDE.md" ]; then
  LINES=$(wc -l < "$ROOT/.claude/CLAUDE.md" | tr -d ' ')
  if [ "$LINES" -gt 100 ]; then
    ISSUES="${ISSUES}\n⚠️ .claude/CLAUDE.md is ${LINES} lines (max 100). Move details to docs/."
    ISSUE_COUNT=$((ISSUE_COUNT + 1))
  fi
fi

# 3. Check markdown links in docs/ point to real files
if [ -d "$ROOT/docs" ]; then
  while IFS= read -r mdfile; do
    # Extract relative markdown links: [text](./path) or [text](path.md)
    while IFS= read -r link; do
      [ -z "$link" ] && continue
      # Skip URLs, anchors, and absolute paths
      case "$link" in
        http*|#*|/*) continue ;;
      esac
      # Resolve relative to the markdown file's directory
      LINK_DIR=$(dirname "$mdfile")
      TARGET="$LINK_DIR/$link"
      if [ ! -f "$TARGET" ] && [ ! -d "$TARGET" ]; then
        ISSUES="${ISSUES}\n🔗 Broken link in $mdfile: $link"
        ISSUE_COUNT=$((ISSUE_COUNT + 1))
      fi
    done < <(grep -oE '\]\([^)]+\)' "$mdfile" 2>/dev/null | sed 's/\](\(.*\))/\1/' | sed 's/#.*//')
  done < <(find "$ROOT/docs" -name "*.md" 2>/dev/null)
fi

# 4. Check ARCHITECTURE.md references existing directories
if [ -f "$ROOT/ARCHITECTURE.md" ]; then
  # Extract backtick-quoted paths that look like directories
  while IFS= read -r dirref; do
    [ -z "$dirref" ] && continue
    CLEAN=$(echo "$dirref" | tr -d '`' | sed 's|/$||')
    # Only check paths that look like project directories (not generic examples)
    if [ -d "$ROOT/$CLEAN" ] || [ -d "$ROOT/src/$CLEAN" ]; then
      : # exists
    elif echo "$CLEAN" | grep -qE '^(src|lib|app|packages)/'; then
      if [ ! -d "$ROOT/$CLEAN" ]; then
        ISSUES="${ISSUES}\n📁 ARCHITECTURE.md references non-existent directory: $CLEAN"
        ISSUE_COUNT=$((ISSUE_COUNT + 1))
      fi
    fi
  done < <(grep -oE '`[a-zA-Z][a-zA-Z0-9_-]*/`' "$ROOT/ARCHITECTURE.md" 2>/dev/null | head -20)
fi

# 5. Check exec-plans/active doesn't have completed plans
if [ -d "$ROOT/docs/exec-plans/active" ]; then
  while IFS= read -r plan; do
    [ -z "$plan" ] && continue
    if grep -q '✅.*Completed\|Status.*Completed\|status.*completed' "$plan" 2>/dev/null; then
      ISSUES="${ISSUES}\n📋 Completed plan still in active/: $(basename "$plan"). Move to completed/."
      ISSUE_COUNT=$((ISSUE_COUNT + 1))
    fi
  done < <(find "$ROOT/docs/exec-plans/active" -name "*.md" 2>/dev/null)
fi

# Output results
if [ "$ISSUE_COUNT" -gt 0 ]; then
  echo "Knowledge base validation: ${ISSUE_COUNT} issue(s) found"
  echo -e "$ISSUES"
  exit 1
else
  echo "Knowledge base validation: ✅ All checks passed"
  exit 0
fi
