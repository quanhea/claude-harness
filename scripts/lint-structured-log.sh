#!/usr/bin/env bash
# Lint: Structured logging enforcement
# Article: "we statically enforce structured logging"
# Rule: No raw console.log/print — use structured logging
# Error messages inject remediation into agent context

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

HOOK_INPUT=$(read_hook_input)
FILE_PATH=$(extract_file_path "$HOOK_INPUT")

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

if ! is_source_file "$FILE_PATH"; then
  exit 0
fi

# Skip test files (console.log in tests is fine)
if is_test_file "$FILE_PATH"; then
  exit 0
fi

VIOLATIONS=""

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    # Check for console.log/warn/error (but allow console.error in catch blocks — too nuanced for grep)
    HITS=$(grep -n 'console\.\(log\|warn\|info\|debug\)(' "$FILE_PATH" 2>/dev/null | head -5)
    if [ -n "$HITS" ]; then
      VIOLATIONS="console.log/warn/info/debug"
    fi
    ;;
  *.py)
    # Check for bare print() (not inside test files)
    HITS=$(grep -n '^[^#]*\bprint(' "$FILE_PATH" 2>/dev/null | head -5)
    if [ -n "$HITS" ]; then
      VIOLATIONS="print()"
    fi
    ;;
  *.go)
    # Check for fmt.Print/Println (should use structured logger)
    HITS=$(grep -n 'fmt\.Print' "$FILE_PATH" 2>/dev/null | head -5)
    if [ -n "$HITS" ]; then
      VIOLATIONS="fmt.Print/Println"
    fi
    ;;
  *.rs)
    # Check for println! (should use tracing/log crate)
    HITS=$(grep -n 'println!' "$FILE_PATH" 2>/dev/null | head -5)
    if [ -n "$HITS" ]; then
      VIOLATIONS="println!"
    fi
    ;;
  *.java)
    # Check for System.out.println
    HITS=$(grep -n 'System\.out\.print' "$FILE_PATH" 2>/dev/null | head -5)
    if [ -n "$HITS" ]; then
      VIOLATIONS="System.out.println"
    fi
    ;;
  *.rb)
    HITS=$(grep -n '^\s*puts\b' "$FILE_PATH" 2>/dev/null | head -5)
    if [ -n "$HITS" ]; then
      VIOLATIONS="puts"
    fi
    ;;
esac

if [ -n "$VIOLATIONS" ]; then
  remediate "File '$FILE_PATH' uses unstructured logging (${VIOLATIONS}). Replace with the project's structured logger. Structured logging enables agents to query logs with LogQL/PromQL. If no structured logger exists, add one (e.g., pino for Node.js, structlog for Python, slog for Go, tracing for Rust)."
fi

exit 0
