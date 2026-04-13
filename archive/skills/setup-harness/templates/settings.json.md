# Template: .claude/settings.json

> This is a TEMPLATE. Adapt the allowed tools based on the detected project.

## Base Settings (all projects)

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Write",
      "Edit"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force *)",
      "Bash(git reset --hard *)"
    ]
  }
}
```

## Variant: Node.js (npm)

Add to `permissions.allow`:
```json
"Bash(npm install *)",
"Bash(npm test *)",
"Bash(npm run *)",
"Bash(npx *)",
"Bash(git status *)",
"Bash(git diff *)",
"Bash(git log *)",
"Bash(git branch *)"
```

## Variant: Node.js (pnpm)

Add to `permissions.allow`:
```json
"Bash(pnpm add *)",
"Bash(pnpm test *)",
"Bash(pnpm run *)",
"Bash(pnpx *)"
```

## Variant: Node.js (yarn)

Add to `permissions.allow`:
```json
"Bash(yarn add *)",
"Bash(yarn test *)",
"Bash(yarn *)"
```

## Variant: Node.js (bun)

Add to `permissions.allow`:
```json
"Bash(bun add *)",
"Bash(bun test *)",
"Bash(bun run *)",
"Bash(bunx *)"
```

## Variant: Python (pip/uv/poetry)

Add to `permissions.allow`:
```json
"Bash(pip install *)",
"Bash(python *)",
"Bash(pytest *)",
"Bash(uv *)",
"Bash(poetry *)"
```

## Variant: Rust

Add to `permissions.allow`:
```json
"Bash(cargo *)"
```

## Variant: Go

Add to `permissions.allow`:
```json
"Bash(go *)"
```

## Variant: Ruby

Add to `permissions.allow`:
```json
"Bash(bundle *)",
"Bash(rails *)",
"Bash(rake *)"
```

## Variant: Java (Maven)

Add to `permissions.allow`:
```json
"Bash(mvn *)",
"Bash(./mvnw *)"
```

## Variant: Java (Gradle)

Add to `permissions.allow`:
```json
"Bash(gradle *)",
"Bash(./gradlew *)"
```

## Adaptation Instructions

1. Start with the base settings
2. Pick the variant matching the detected package manager
3. Add the build/test/lint commands from the project's config
4. If the project has an existing .claude/settings.json, MERGE — keep existing allow/deny and add missing entries
5. Write the final JSON to `.claude/settings.json`
