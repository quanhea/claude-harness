#!/usr/bin/env bash
# Common utilities for harness linter scripts
# All linters output JSON to stdout for hook integration

set -euo pipefail

# Read hook input from stdin (PostToolUse provides tool name + input/output)
read_hook_input() {
  if [ -t 0 ]; then
    echo "{}"
  else
    cat
  fi
}

# Extract the file path from hook input JSON
# PostToolUse for Edit/Write sends: {"tool_name":"Edit","tool_input":{"file_path":"..."}}
extract_file_path() {
  local input="$1"
  echo "$input" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # Try tool_input.file_path (Edit/Write)
    fp = data.get('tool_input', {}).get('file_path', '')
    if not fp:
        fp = data.get('tool_input', {}).get('path', '')
    print(fp)
except:
    print('')
" 2>/dev/null || echo ""
}

# Output a warning message that gets injected into agent context
warn() {
  local message="$1"
  echo "{\"hookSpecificOutput\":{\"message\":\"⚠️ HARNESS LINT: ${message}\"}}" >&2
}

# Output remediation instructions (injected into agent context)
remediate() {
  local message="$1"
  # Print to stderr for visibility, exit 0 to not block
  echo "⚠️ HARNESS LINT: ${message}" >&2
}

# Check if a file should be linted (skip non-source files)
is_source_file() {
  local file="$1"
  case "$file" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.py|*.rs|*.go|*.java|*.rb|*.php|*.swift|*.kt|*.cs)
      return 0 ;;
    *)
      return 1 ;;
  esac
}

# Check if a file is a test file
is_test_file() {
  local file="$1"
  case "$file" in
    *.test.*|*.spec.*|*_test.*|*_spec.*|*/test/*|*/tests/*|*/__tests__/*)
      return 0 ;;
    *)
      return 1 ;;
  esac
}

# Get project root (walk up to find .git or .claude)
project_root() {
  local dir="${1:-.}"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.git" ] || [ -d "$dir/.claude" ]; then
      echo "$dir"
      return
    fi
    dir="$(dirname "$dir")"
  done
  echo "."
}
