#!/usr/bin/env bash
# Quality grading script
# Article: "A quality document grades each product domain and architectural layer,
# tracking gaps over time."
# Provides automated metrics per domain. Skills use this data to assign letter grades.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

ROOT="${1:-.}"

echo "# Quality Metrics Report"
echo ""
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Find source directories (domains)
DOMAINS=""
if [ -d "$ROOT/src" ]; then
  DOMAINS=$(find "$ROOT/src" -maxdepth 1 -type d ! -name src | sort)
elif [ -d "$ROOT/lib" ]; then
  DOMAINS=$(find "$ROOT/lib" -maxdepth 1 -type d ! -name lib | sort)
elif [ -d "$ROOT/app" ]; then
  DOMAINS=$(find "$ROOT/app" -maxdepth 1 -type d ! -name app | sort)
fi

if [ -z "$DOMAINS" ]; then
  echo "No domains found. Treating project root as single domain."
  DOMAINS="$ROOT"
fi

echo "| Domain | Source Files | Test Files | Test Ratio | Avg Lines/File | Max Lines |"
echo "|--------|-------------|-----------|------------|----------------|-----------|"

for domain in $DOMAINS; do
  DOMAIN_NAME=$(basename "$domain")

  # Count source files (exclude tests)
  SRC_COUNT=$(find "$domain" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.rb" \) \
    ! -name "*.test.*" ! -name "*.spec.*" ! -name "*_test.*" ! -path "*/test/*" ! -path "*/tests/*" ! -path "*/__tests__/*" \
    ! -path "*/node_modules/*" ! -path "*/dist/*" 2>/dev/null | wc -l | tr -d ' ')

  # Count test files
  TEST_COUNT=$(find "$domain" -type f \( -name "*.test.*" -o -name "*.spec.*" -o -name "*_test.*" \) \
    ! -path "*/node_modules/*" ! -path "*/dist/*" 2>/dev/null | wc -l | tr -d ' ')

  # Test ratio
  if [ "$SRC_COUNT" -gt 0 ]; then
    RATIO=$(echo "scale=0; $TEST_COUNT * 100 / $SRC_COUNT" | bc 2>/dev/null || echo "0")
  else
    RATIO="0"
  fi

  # Average and max line count
  if [ "$SRC_COUNT" -gt 0 ]; then
    LINE_STATS=$(find "$domain" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.rb" \) \
      ! -name "*.test.*" ! -name "*.spec.*" ! -name "*_test.*" ! -path "*/test/*" ! -path "*/tests/*" \
      ! -path "*/node_modules/*" ! -path "*/dist/*" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
    TOTAL_LINES="${LINE_STATS:-0}"
    AVG_LINES=$((TOTAL_LINES / SRC_COUNT))

    MAX_LINES=$(find "$domain" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.rb" \) \
      ! -name "*.test.*" ! -name "*.spec.*" ! -name "*_test.*" ! -path "*/test/*" ! -path "*/tests/*" \
      ! -path "*/node_modules/*" ! -path "*/dist/*" -exec wc -l {} + 2>/dev/null | sort -rn | head -1 | awk '{print $1}')
  else
    AVG_LINES="0"
    MAX_LINES="0"
  fi

  echo "| $DOMAIN_NAME | $SRC_COUNT | $TEST_COUNT | ${RATIO}% | $AVG_LINES | $MAX_LINES |"
done

echo ""
echo "## Summary"
echo ""

# Overall counts
TOTAL_SRC=$(find "$ROOT" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.rb" \) \
  ! -name "*.test.*" ! -name "*.spec.*" ! -name "*_test.*" ! -path "*/test/*" ! -path "*/tests/*" \
  ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' ')

TOTAL_TEST=$(find "$ROOT" -type f \( -name "*.test.*" -o -name "*.spec.*" -o -name "*_test.*" \) \
  ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' ')

OVERSIZED=$(find "$ROOT" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.rb" \) \
  ! -name "*.test.*" ! -name "*.spec.*" ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.git/*" \
  -exec sh -c 'test $(wc -l < "$1") -gt 300' _ {} \; -print 2>/dev/null | wc -l | tr -d ' ')

echo "- Total source files: $TOTAL_SRC"
echo "- Total test files: $TOTAL_TEST"
echo "- Files over 300 lines: $OVERSIZED"
