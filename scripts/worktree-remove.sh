#!/usr/bin/env bash
# WorktreeRemove hook handler
# Called by Claude Code when a worktree is removed.
# Tears down: docker containers, database, port registry entry.
# Always exits 0 — teardown failures must not block worktree removal.

set -uo pipefail  # No -e: we want to continue on errors

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"
source "$SCRIPT_DIR/worktree-detect.sh"

PORT_REGISTRY="${HOME}/.claude/worktree-ports.json"

# --- Parse hook input ---
HOOK_INPUT=$(read_hook_input)
WORKTREE_PATH=$(echo "$HOOK_INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('worktree_path',''))" 2>/dev/null || echo "")

if [ -z "$WORKTREE_PATH" ]; then
  echo "WORKTREE: No worktree path provided, skipping teardown" >&2
  exit 0
fi

SLUG=$(worktree_slug "$(basename "$WORKTREE_PATH")")
echo "WORKTREE: Tearing down isolation for '$SLUG'" >&2

# --- Look up registry for this worktree ---
REGISTRY_ENTRY=""
if [ -f "$PORT_REGISTRY" ]; then
  REGISTRY_ENTRY=$(python3 -c "
import json
try:
    registry = json.load(open('$PORT_REGISTRY'))
    entry = registry.get('$SLUG', {})
    if entry:
        print(json.dumps(entry))
except:
    pass
" 2>/dev/null || echo "")
fi

if [ -z "$REGISTRY_ENTRY" ]; then
  echo "WORKTREE: No registry entry for '$SLUG', nothing to tear down" >&2
  exit 0
fi

# Extract info from registry
DB_NAME=$(echo "$REGISTRY_ENTRY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('db_name',''))" 2>/dev/null || echo "")
DB_TYPE=$(echo "$REGISTRY_ENTRY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('db_type','none'))" 2>/dev/null || echo "none")
DOCKER_PROJECT=$(echo "$REGISTRY_ENTRY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('docker_project',''))" 2>/dev/null || echo "")

# --- Stop docker-compose ---
if [ -n "$DOCKER_PROJECT" ]; then
  read -r _ HAS_DOCKER_COMPOSE COMPOSE_CMD <<< "$(detect_docker)"
  if [ "$HAS_DOCKER_COMPOSE" = "true" ]; then
    echo "WORKTREE: stopping docker project $DOCKER_PROJECT" >&2
    $COMPOSE_CMD -p "$DOCKER_PROJECT" down -v --remove-orphans 2>&1 | tail -3 >&2 || true
  fi
fi

# --- Drop database ---
if [ -n "$DB_NAME" ] && [ "$DB_TYPE" != "none" ] && [ "$DB_TYPE" != "sqlite" ]; then
  # SAFETY CHECK: only drop databases with _wt_ marker
  if echo "$DB_NAME" | grep -q '_wt_'; then
    case "$DB_TYPE" in
      postgresql)
        if command -v dropdb >/dev/null 2>&1; then
          dropdb --if-exists "$DB_NAME" 2>/dev/null && echo "WORKTREE: dropped PostgreSQL database $DB_NAME" >&2 || echo "WORKTREE: dropdb failed (continuing)" >&2
        fi
        ;;
      mysql)
        if command -v mysql >/dev/null 2>&1; then
          mysql -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`" 2>/dev/null && echo "WORKTREE: dropped MySQL database $DB_NAME" >&2 || echo "WORKTREE: MySQL drop failed (continuing)" >&2
        fi
        ;;
    esac
  else
    echo "WORKTREE: SAFETY: refusing to drop database '$DB_NAME' — does not contain '_wt_' marker" >&2
  fi
fi

# --- Remove port registry entry ---
python3 -c "
import json, os, fcntl

registry_path = '$PORT_REGISTRY'
slug = '$SLUG'

if not os.path.exists(registry_path):
    exit(0)

fd = os.open(registry_path, os.O_RDWR)
try:
    fcntl.flock(fd, fcntl.LOCK_EX)
    content = os.read(fd, 1024*1024).decode('utf-8').strip()
    registry = json.loads(content) if content else {}
    registry.pop(slug, None)
    os.lseek(fd, 0, 0)
    os.ftruncate(fd, 0)
    os.write(fd, json.dumps(registry, indent=2).encode('utf-8'))
finally:
    fcntl.flock(fd, fcntl.LOCK_UN)
    os.close(fd)
" 2>/dev/null && echo "WORKTREE: removed from port registry" >&2 || true

echo "WORKTREE: teardown complete for '$SLUG'" >&2
exit 0
