const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { loadPrompt, renderPrompt, buildPromptVars } = require("../dist/prompt");

describe("loadPrompt", () => {
  it("loads a bundled prompt by filename and returns text + meta", () => {
    const loaded = loadPrompt("claude-md.md");
    assert.ok(loaded.text.includes("{{PROJECT_DIR}}"));
    assert.ok(loaded.text.includes("TaskCreate"));
    assert.ok(loaded.meta);
  });

  it("loads by absolute path", () => {
    const absPath = path.join(__dirname, "..", "prompts", "claude-md.md");
    const loaded = loadPrompt(absPath);
    assert.ok(loaded.text.includes("CLAUDE.md"));
  });

  it("throws on missing file", () => {
    assert.throws(() => loadPrompt("nonexistent.md"), /not found/);
  });

  it("loads gardener-init.md", () => {
    const loaded = loadPrompt("gardener-init.md");
    assert.ok(loaded.text.includes("{{HEAD_COMMIT}}"));
    assert.ok(loaded.text.includes("Explore"));
  });

  it("loads gardener-update.md", () => {
    const loaded = loadPrompt("gardener-update.md");
    assert.ok(loaded.text.includes("{{CHANGED_FILES}}"));
    assert.ok(loaded.text.includes("{{LAST_COMMIT}}"));
  });

  it("parses max-turns: null frontmatter as unlimited", () => {
    const loaded = loadPrompt("skills.md");
    assert.equal(loaded.meta.maxTurns, null, "skills.md declares max-turns: null");
    assert.ok(!loaded.text.startsWith("---"), "frontmatter should be stripped from text");
  });

  it("parses numeric max-turns frontmatter", () => {
    const loaded = loadPrompt("worktree.md");
    assert.equal(loaded.meta.maxTurns, 200, "worktree.md declares max-turns: 200");
  });

  it("returns empty meta when no frontmatter present", () => {
    const loaded = loadPrompt("settings-json.md");
    assert.equal(loaded.meta.maxTurns, undefined, "settings-json.md has no frontmatter");
  });
});

describe("renderPrompt", () => {
  it("replaces placeholders from vars map", () => {
    const template = "project at {{PROJECT_DIR}} output at {{OUTPUT_DIR}}";
    const result = renderPrompt(template, {
      PROJECT_DIR: "/home/user/my-app",
      OUTPUT_DIR: "/home/user/my-app/.claude-harness",
    });
    assert.equal(result, "project at /home/user/my-app output at /home/user/my-app/.claude-harness");
  });

  it("replaces multiple occurrences of the same key", () => {
    const template = "{{PROJECT_DIR}} and {{PROJECT_DIR}} again";
    const result = renderPrompt(template, { PROJECT_DIR: "/my-app" });
    assert.equal(result, "/my-app and /my-app again");
  });

  it("returns unchanged string when no placeholders", () => {
    const result = renderPrompt("no placeholders here", {});
    assert.equal(result, "no placeholders here");
  });

  it("replaces task-specific vars", () => {
    const template = "task {{TASK_ID}} in {{PROJECT_DIR}} writes to {{OUTPUT_DIR}}";
    const result = renderPrompt(template, {
      TASK_ID: "claude-md",
      PROJECT_DIR: "/my-app",
      OUTPUT_DIR: "/my-app/.claude-harness",
    });
    assert.equal(result, "task claude-md in /my-app writes to /my-app/.claude-harness");
  });
});

describe("buildPromptVars", () => {
  it("returns exactly three variables", () => {
    const vars = buildPromptVars({
      taskId: "settings-json",
      targetDir: "/home/user/my-app",
      outputDir: "/home/user/my-app/.claude-harness",
    });
    assert.equal(vars.PROJECT_DIR, "/home/user/my-app");
    assert.equal(vars.OUTPUT_DIR, "/home/user/my-app/.claude-harness");
    assert.equal(vars.TASK_ID, "settings-json");
    assert.equal(Object.keys(vars).length, 3, "should only have 3 vars — orchestrator passes no project-type flags");
  });
});
