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
  # Utils(-1, special) | Types(0) → Config(1) → Repo(2) → Providers(3) → Service(4) → Runtime(5) → UI(6) → App Wiring(7)
  # Utils can be imported by anything. Providers are the cross-cutting interface.
  case "$rel" in
    */utils/*|*/util/*|*/lib/*|*/helpers/*|*/common/*|*/shared/*)
      echo -2 ;; # Utils — can be imported by any layer, skip checks
    */types/*|*/type/*|*/models/*|*/model/*|*/interfaces/*|*/schemas/*|*/schema/*|*/dto/*)
      echo 0 ;;
    */config/*|*/configs/*|*/configuration/*)
      echo 1 ;;
    */repo/*|*/repository/*|*/repositories/*|*/dal/*|*/data/*|*/db/*)
      echo 2 ;;
    */provider/*|*/providers/*|*/connectors/*|*/connector/*)
      echo 3 ;;
    */service/*|*/services/*|*/domain/*|*/business/*|*/use-case/*|*/usecases/*)
      echo 4 ;;
    */runtime/*|*/server/*|*/middleware/*|*/controller/*|*/controllers/*|*/handler/*|*/handlers/*|*/routes/*|*/api/*)
      echo 5 ;;
    */ui/*|*/components/*|*/pages/*|*/views/*|*/screens/*|*/layouts/*)
      echo 6 ;;
    */app/*|*/wiring/*|*/bootstrap/*)
      echo 7 ;;
    *)
      echo -1 ;; # Unknown layer — don't lint
  esac
}

MY_LAYER=$(get_layer "$FILE_PATH")

# If we can't determine the layer, or it's Utils (-2), skip
if [ "$MY_LAYER" = "-1" ] || [ "$MY_LAYER" = "-2" ]; then
  exit 0
fi

LAYER_NAMES=("types" "config" "repo" "providers" "service" "runtime" "ui" "app-wiring")
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
  for higher_idx in $(seq $((MY_LAYER + 1)) 7); do
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

Architecture rule: dependencies flow Types → Config → Repo → Providers → Service → Runtime → UI → App Wiring.
A '${MY_LAYER_NAME}' file must NOT import from layers to its right.
Cross-cutting concerns (auth, logging, metrics) must go through the Providers layer.
Utils can be imported by any layer. Move shared code to Utils or extract a Provider interface.
See docs/ARCHITECTURE.md for the full dependency rules."
fi

exit 0
