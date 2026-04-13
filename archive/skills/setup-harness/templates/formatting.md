# Template: Formatting Rules

> Article: "initial scaffold—repository structure, CI configuration, formatting rules"
> For existing projects: discover the formatter already in use. Do NOT overwrite.
> For greenfield: research current best practices for the language.
> NEVER hardcode formatter config values.

---

## How to Generate

### For EXISTING projects:

**Launch an Explore agent** to discover existing formatting:

```
Agent(subagent_type: "Explore", prompt: "Find the formatting/linting setup in this project:
1. Is there a formatter config? (.prettierrc, .prettierrc.js, prettier.config.js,
   ruff.toml, pyproject.toml [tool.ruff], rustfmt.toml, .editorconfig,
   .rubocop.yml, .clang-format, gofmt, etc.)
2. Is there a linter config? (.eslintrc, eslint.config.js, ruff, pylint, golangci-lint, clippy)
3. What format/lint commands exist in package.json scripts or Makefile?
4. Is there a pre-commit hook for formatting?
5. What's the indentation style? (tabs vs spaces, how many?)
6. What's the line length limit?
Report all config file paths and their contents.")
```

**If a formatter config already exists**: Do NOT create a new one. Just document the
existing format command in `CLAUDE.md` Commands section.

**If NO formatter config exists**: Proceed to generate one.

### For GREENFIELD projects (or existing without formatter):

**Launch a research agent** to find current best practices:

```
Agent(subagent_type: "general-purpose", prompt: "Search the web for the current
recommended formatter and config for {{language}} {{framework}} projects as of {{year}}.
Find:
1. The most popular formatter tool
2. The recommended default config
3. Common .editorconfig settings
Search for '{{language}} formatter recommended config {{year}}'")
```

Generate the config based on research findings.

---

## Output

1. Write the formatter config file based on discovery or research
2. Write `.editorconfig` if one doesn't exist (research the right values)
3. Add the format command to `CLAUDE.md` Commands section
4. If there's a lint command, add it too

## Adaptation Instructions

1. ALWAYS check for existing formatter config first — never overwrite
2. For greenfield, use research results, not hardcoded defaults
3. Add the format command to the project's CLAUDE.md Commands section
4. If the project has a pre-commit hook for formatting, document it in rules
