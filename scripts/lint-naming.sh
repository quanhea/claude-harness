#!/usr/bin/env bash
# Lint: Naming conventions for files
# Article: "naming conventions for schemas and types"
# Rule: Source files must be kebab-case (e.g., user-service.ts, not UserService.ts)
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

BASENAME=$(basename "$FILE_PATH")

# Remove extension and test/spec suffixes for checking
NAME="${BASENAME%.*}"
NAME="${NAME%.test}"
NAME="${NAME%.spec}"
NAME="${NAME%_test}"
NAME="${NAME%_spec}"

# Check for PascalCase or camelCase filenames (should be kebab-case)
# Allow: index, main, app, mod, lib (common single-word names)
if echo "$NAME" | grep -qE '[A-Z]'; then
  remediate "File '$FILE_PATH' uses PascalCase/camelCase naming. Rename to kebab-case: '$(echo "$NAME" | sed 's/\([A-Z]\)/-\L\1/g' | sed 's/^-//')'. Convention: files use kebab-case, only types/classes use PascalCase."
fi

# Check for underscores (should be dashes) — except Python files where snake_case is standard
case "$FILE_PATH" in
  *.py) ;; # Python uses snake_case for files — skip
  *)
    if echo "$NAME" | grep -qE '_' && ! echo "$NAME" | grep -qE '^__'; then
      SUGGESTED=$(echo "$NAME" | tr '_' '-')
      remediate "File '$FILE_PATH' uses underscores. Rename to kebab-case: '${SUGGESTED}'. Convention: use dashes, not underscores, in file names."
    fi
    ;;
esac

exit 0
