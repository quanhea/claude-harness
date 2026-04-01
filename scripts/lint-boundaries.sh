#!/usr/bin/env bash
# Lint: Boundary validation
# Article: "we require Codex to parse data shapes at the boundary"
# Rule: External data must be validated at system boundaries
# Detects common patterns of unvalidated external data usage.
# Error messages inject remediation into agent context.

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

if is_test_file "$FILE_PATH"; then
  exit 0
fi

VIOLATIONS=""

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    # Check for unvalidated JSON.parse (should use schema validation)
    HITS=$(grep -n 'JSON\.parse(' "$FILE_PATH" 2>/dev/null | grep -v 'z\.\|zod\|schema\|parse\|validate\|Schema' | head -3)
    if [ -n "$HITS" ]; then
      VIOLATIONS="${VIOLATIONS}\n  JSON.parse without schema validation"
    fi

    # Check for untyped response.json() / res.json()
    HITS=$(grep -n '\.json()' "$FILE_PATH" 2>/dev/null | grep -v 'z\.\|zod\|schema\|parse\|validate\|as\b' | head -3)
    if [ -n "$HITS" ]; then
      VIOLATIONS="${VIOLATIONS}\n  .json() response without schema validation"
    fi

    # Check for 'as any' type assertion (bypasses type safety)
    HITS=$(grep -n 'as any' "$FILE_PATH" 2>/dev/null | head -3)
    if [ -n "$HITS" ]; then
      VIOLATIONS="${VIOLATIONS}\n  'as any' type assertion (bypasses type safety at boundary)"
    fi
    ;;

  *.py)
    # Check for unvalidated json.loads
    HITS=$(grep -n 'json\.loads\|json\.load(' "$FILE_PATH" 2>/dev/null | grep -vi 'pydantic\|model_validate\|TypeAdapter\|schema\|BaseModel' | head -3)
    if [ -n "$HITS" ]; then
      VIOLATIONS="${VIOLATIONS}\n  json.loads/load without Pydantic/schema validation"
    fi

    # Check for untyped request data access
    HITS=$(grep -n 'request\.json\|request\.form\|request\.args' "$FILE_PATH" 2>/dev/null | grep -vi 'pydantic\|validate\|schema' | head -3)
    if [ -n "$HITS" ]; then
      VIOLATIONS="${VIOLATIONS}\n  Direct request data access without validation"
    fi
    ;;

  *.go)
    # Check for json.Unmarshal into interface{}/any
    HITS=$(grep -n 'json\.Unmarshal.*interface{}\|json\.Unmarshal.*any' "$FILE_PATH" 2>/dev/null | head -3)
    if [ -n "$HITS" ]; then
      VIOLATIONS="${VIOLATIONS}\n  json.Unmarshal into interface{}/any (use typed struct)"
    fi
    ;;

  *.rs)
    # Check for unwrap() on deserialization (should handle errors)
    HITS=$(grep -n 'serde_json::from_str.*unwrap\|from_str.*\.unwrap()' "$FILE_PATH" 2>/dev/null | head -3)
    if [ -n "$HITS" ]; then
      VIOLATIONS="${VIOLATIONS}\n  Deserialization with unwrap() (use Result/? operator)"
    fi
    ;;
esac

if [ -n "$VIOLATIONS" ]; then
  remediate "File '$FILE_PATH' may have unvalidated boundary data:${VIOLATIONS}

Boundary rule: Parse, don't validate. All external data (API responses, user input, file reads, env vars) MUST be parsed through a schema validator at system entry points.
- TypeScript: Use Zod, io-ts, or similar
- Python: Use Pydantic BaseModel or TypeAdapter
- Go: Unmarshal into typed structs
- Rust: Use serde with proper error handling
Internal code should trust already-validated data — no redundant checks."
fi

exit 0
