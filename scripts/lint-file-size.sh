#!/usr/bin/env bash
# Lint: File size limits
# Article: "we statically enforce... file size limits"
# Rule: Source files should not exceed ~300 lines
# Error messages inject remediation into agent context

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

MAX_LINES="${HARNESS_MAX_FILE_LINES:-300}"

HOOK_INPUT=$(read_hook_input)
FILE_PATH=$(extract_file_path "$HOOK_INPUT")

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Only lint source files
if ! is_source_file "$FILE_PATH"; then
  exit 0
fi

# Skip test files (they can be longer)
if is_test_file "$FILE_PATH"; then
  exit 0
fi

LINE_COUNT=$(wc -l < "$FILE_PATH" | tr -d ' ')

if [ "$LINE_COUNT" -gt "$MAX_LINES" ]; then
  remediate "File '$FILE_PATH' is ${LINE_COUNT} lines (max ${MAX_LINES}). Split this file — one concept per file. Extract related functions into a separate module and import them."
fi

exit 0
