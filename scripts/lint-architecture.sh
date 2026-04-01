#!/usr/bin/env bash
# Lint: Architecture dependency direction
# Article: "Each business domain is divided into a fixed set of layers, with strictly
# validated dependency directions and a limited set of permissible edges."
# Rule: Imports must flow forward through layers. Reads ARCHITECTURE.md for rules.
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

ROOT=$(project_root "$(dirname "$FILE_PATH")")

# Determine which layer this file belongs to based on path
get_layer() {
  local file="$1"
  local rel="${file#$ROOT/}"
  # Map directory names to layer indices (lower = earlier in chain)
  # Types(0) → Config(1) → Repo(2) → Service(3) → Runtime(4) → UI(5)
  case "$rel" in
    */types/*|*/type/*|*/models/*|*/model/*|*/interfaces/*|*/schemas/*|*/schema/*|*/dto/*)
      echo 0 ;;
    */config/*|*/configs/*|*/configuration/*)
      echo 1 ;;
    */repo/*|*/repository/*|*/repositories/*|*/dal/*|*/data/*|*/db/*)
      echo 2 ;;
    */service/*|*/services/*|*/domain/*|*/business/*|*/use-case/*|*/usecases/*)
      echo 3 ;;
    */runtime/*|*/server/*|*/app/*|*/middleware/*|*/controller/*|*/controllers/*|*/handler/*|*/handlers/*|*/routes/*|*/api/*)
      echo 4 ;;
    */ui/*|*/components/*|*/pages/*|*/views/*|*/screens/*|*/layouts/*)
      echo 5 ;;
    *)
      echo -1 ;; # Unknown layer — don't lint
  esac
}

MY_LAYER=$(get_layer "$FILE_PATH")

# If we can't determine the layer, skip
if [ "$MY_LAYER" = "-1" ]; then
  exit 0
fi

LAYER_NAMES=("types" "config" "repo" "service" "runtime" "ui")
MY_LAYER_NAME="${LAYER_NAMES[$MY_LAYER]}"

# Check imports in the file for backward dependencies
check_imports() {
  local file="$1"

  # Extract import paths based on language
  case "$file" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
      grep -noE "(from ['\"]\.\.?/[^'\"]+['\"]|require\(['\"]\.\.?/[^'\"]+['\"]\))" "$file" 2>/dev/null
      ;;
    *.py)
      grep -noE "^(from|import) \." "$file" 2>/dev/null
      ;;
    *.go)
      grep -noE '"[^"]*"' "$file" 2>/dev/null | grep -v '"[a-z]*"'
      ;;
    *)
      ;;
  esac
}

VIOLATIONS=""
while IFS= read -r line; do
  [ -z "$line" ] && continue

  # Check if the imported path points to a higher layer
  for higher_idx in $(seq $((MY_LAYER + 1)) 5); do
    HIGHER_NAME="${LAYER_NAMES[$higher_idx]}"
    # Check if import contains a higher-layer directory name
    if echo "$line" | grep -qiE "/(${HIGHER_NAME}|$(echo "$HIGHER_NAME" | sed 's/s$//')s?)/" 2>/dev/null; then
      LINE_NUM=$(echo "$line" | cut -d: -f1)
      VIOLATIONS="${VIOLATIONS}\n  Line ${LINE_NUM}: imports from '${HIGHER_NAME}' layer"
    fi
  done
done < <(check_imports "$FILE_PATH")

if [ -n "$VIOLATIONS" ]; then
  remediate "File '$FILE_PATH' (${MY_LAYER_NAME} layer) has backward dependency violations:${VIOLATIONS}

Architecture rule: dependencies flow Types → Config → Repo → Service → Runtime → UI.
A '${MY_LAYER_NAME}' file must NOT import from layers to its right.
Move the shared code to the correct layer or extract an interface.
See docs/ARCHITECTURE.md for the full dependency rules."
fi

exit 0
