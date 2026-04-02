#!/usr/bin/env bash
# Worktree detection utilities — sourced by worktree-create.sh and worktree-remove.sh
# Pure detection functions. Sets variables, never mutates state.

# Sanitize a worktree name to a safe slug for DB names, docker projects, etc.
worktree_slug() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/-\+/-/g' | sed 's/^-\|-$//g'
}

# Compute a deterministic base port from a slug (range 10000-59999, 10 ports per worktree)
compute_port_base() {
  local slug="$1"
  local project_path="${2:-$(pwd)}"
  # Include project path in hash so different projects with same worktree name don't collide
  local hash_input="${project_path}:${slug}"
  local hash
  hash=$(echo -n "$hash_input" | cksum | awk '{print $1}')
  echo $(( (hash % 50000) + 10000 ))
}

# Detect project type from files in given directory
detect_project_type() {
  local dir="${1:-.}"
  if [ -f "$dir/package.json" ]; then
    echo "node"
  elif [ -f "$dir/pyproject.toml" ] || [ -f "$dir/requirements.txt" ] || [ -f "$dir/setup.py" ] || [ -f "$dir/Pipfile" ]; then
    echo "python"
  elif [ -f "$dir/go.mod" ]; then
    echo "go"
  elif [ -f "$dir/Cargo.toml" ]; then
    echo "rust"
  elif [ -f "$dir/pom.xml" ] || [ -f "$dir/build.gradle" ] || [ -f "$dir/build.gradle.kts" ]; then
    echo "java"
  elif [ -f "$dir/Gemfile" ]; then
    echo "ruby"
  elif [ -f "$dir/composer.json" ]; then
    echo "php"
  else
    echo "unknown"
  fi
}

# Detect database type from project config
detect_database() {
  local dir="${1:-.}"

  # Check docker-compose files for database images
  for compose in "$dir"/docker-compose*.yml "$dir"/docker-compose*.yaml "$dir"/compose*.yml "$dir"/compose*.yaml; do
    [ -f "$compose" ] || continue
    if grep -qiE 'postgres|postgresql' "$compose" 2>/dev/null; then
      echo "postgresql"; return
    fi
    if grep -qi 'mysql' "$compose" 2>/dev/null; then
      echo "mysql"; return
    fi
  done

  # Check .env files for DATABASE_URL
  for envf in "$dir/.env" "$dir/.env.local" "$dir/.env.development"; do
    [ -f "$envf" ] || continue
    if grep -qE 'postgres(ql)?://' "$envf" 2>/dev/null; then
      echo "postgresql"; return
    fi
    if grep -qE 'mysql://' "$envf" 2>/dev/null; then
      echo "mysql"; return
    fi
    if grep -qE 'sqlite' "$envf" 2>/dev/null; then
      echo "sqlite"; return
    fi
  done

  # Check for Prisma schema
  if [ -f "$dir/prisma/schema.prisma" ]; then
    if grep -q 'postgresql' "$dir/prisma/schema.prisma" 2>/dev/null; then
      echo "postgresql"; return
    elif grep -q 'mysql' "$dir/prisma/schema.prisma" 2>/dev/null; then
      echo "mysql"; return
    elif grep -q 'sqlite' "$dir/prisma/schema.prisma" 2>/dev/null; then
      echo "sqlite"; return
    fi
  fi

  # Check Django settings
  if grep -rql "DATABASES" "$dir"/*/settings*.py 2>/dev/null; then
    if grep -rqE 'postgresql|psycopg' "$dir"/*/settings*.py 2>/dev/null; then
      echo "postgresql"; return
    fi
  fi

  # Check for SQLite files
  if ls "$dir"/*.db "$dir"/*.sqlite3 2>/dev/null | head -1 | grep -q .; then
    echo "sqlite"; return
  fi

  echo "none"
}

# Detect docker availability
detect_docker() {
  local has_docker="false"
  local has_compose="false"
  local compose_cmd=""

  if command -v docker >/dev/null 2>&1; then
    has_docker="true"
    if docker compose version >/dev/null 2>&1; then
      has_compose="true"
      compose_cmd="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
      has_compose="true"
      compose_cmd="docker-compose"
    fi
  fi

  echo "$has_docker $has_compose $compose_cmd"
}

# Find the project's .env file
detect_env_file() {
  local dir="${1:-.}"
  for envf in "$dir/.env" "$dir/.env.local" "$dir/.env.development"; do
    if [ -f "$envf" ]; then
      echo "$envf"; return
    fi
  done
  echo ""
}

# Extract project name from config files
detect_project_name() {
  local dir="${1:-.}"
  if [ -f "$dir/package.json" ]; then
    python3 -c "import json; print(json.load(open('$dir/package.json')).get('name',''))" 2>/dev/null && return
  fi
  if [ -f "$dir/pyproject.toml" ]; then
    grep -m1 '^name' "$dir/pyproject.toml" 2>/dev/null | sed 's/name *= *"\(.*\)"/\1/' && return
  fi
  basename "$dir"
}
