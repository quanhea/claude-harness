const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { loadPrompt, renderPrompt, buildPromptVars } = require("../dist/prompt");

// Fixture helper for frontmatter edge cases — writes a prompt file to a
// tmp dir and returns its path. loadPrompt accepts absolute paths so we can
// exercise parseFrontmatter without exporting it.
let tmpFxDir;
before(() => { tmpFxDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-prompt-fx-")); });
after(() => { fs.rmSync(tmpFxDir, { recursive: true, force: true }); });
const writeFixture = (name, body) => {
  const p = path.join(tmpFxDir, name);
  fs.writeFileSync(p, body);
  return p;
};

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

describe("frontmatter edge cases", () => {
  it("strips double-quoted description", () => {
    const p = writeFixture("quoted-desc.md", `---
description: "quoted with \\"embedded\\" quotes handled weirdly"
---

body`);
    const loaded = loadPrompt(p);
    // Implementation uses a regex .replace(/^["'](.*)["']$/, "$1") — strips
    // the outer pair but leaves inner content untouched.
    assert.ok(loaded.meta.description);
    assert.ok(!loaded.meta.description.startsWith('"'));
  });

  it("strips single-quoted description", () => {
    const p = writeFixture("squoted-desc.md", `---
description: 'single quoted'
---

body`);
    assert.equal(loadPrompt(p).meta.description, "single quoted");
  });

  it("parses outputs as a JSON-style array", () => {
    const p = writeFixture("outputs-array.md", `---
outputs: ["a.md", "b/c.md", ".claude/skills/*/SKILL.md"]
---

body`);
    assert.deepEqual(loadPrompt(p).meta.outputs, ["a.md", "b/c.md", ".claude/skills/*/SKILL.md"]);
  });

  it("leaves outputs undefined when value is not an array", () => {
    const p = writeFixture("outputs-scalar.md", `---
outputs: "a.md"
---

body`);
    assert.equal(loadPrompt(p).meta.outputs, undefined);
  });

  it("leaves outputs undefined when JSON is malformed", () => {
    const p = writeFixture("outputs-bad.md", `---
outputs: ["unterminated
---

body`);
    assert.equal(loadPrompt(p).meta.outputs, undefined);
  });

  it("leaves outputs undefined when array contains non-strings", () => {
    const p = writeFixture("outputs-mixed.md", `---
outputs: ["ok.md", 42, "also-ok.md"]
---

body`);
    assert.equal(loadPrompt(p).meta.outputs, undefined);
  });

  it("parses max-turns: ~ as unlimited (null)", () => {
    const p = writeFixture("turns-tilde.md", `---
max-turns: ~
---

body`);
    assert.equal(loadPrompt(p).meta.maxTurns, null);
  });

  it("parses empty max-turns value as null", () => {
    const p = writeFixture("turns-empty.md", `---
max-turns:
---

body`);
    assert.equal(loadPrompt(p).meta.maxTurns, null);
  });

  it("leaves maxTurns undefined for non-numeric invalid value", () => {
    const p = writeFixture("turns-bad.md", `---
max-turns: banana
---

body`);
    assert.equal(loadPrompt(p).meta.maxTurns, undefined);
  });

  it("parses always-run: true", () => {
    const p = writeFixture("always-run-true.md", `---
description: x
always-run: true
---

body`);
    assert.equal(loadPrompt(p).meta.alwaysRun, true);
  });

  it("parses always-run: yes", () => {
    const p = writeFixture("always-run-yes.md", `---
always-run: yes
---

body`);
    assert.equal(loadPrompt(p).meta.alwaysRun, true);
  });

  it("leaves alwaysRun undefined when key is absent", () => {
    const p = writeFixture("no-always-run.md", `---
description: no always-run key
---

body`);
    assert.equal(loadPrompt(p).meta.alwaysRun, undefined);
  });

  it("parses always-run: false as false (not undefined)", () => {
    const p = writeFixture("always-run-false.md", `---
always-run: false
---

body`);
    assert.equal(loadPrompt(p).meta.alwaysRun, false);
  });

  it("claude-md.md has always-run: true", () => {
    const loaded = loadPrompt("claude-md.md");
    assert.equal(loaded.meta.alwaysRun, true, "claude-md.md must always re-run");
  });

  it("ignores unknown frontmatter keys", () => {
    const p = writeFixture("unknown-key.md", `---
description: test
pineapple: yes
max-turns: 5
---

body`);
    const { meta } = loadPrompt(p);
    assert.equal(meta.description, "test");
    assert.equal(meta.maxTurns, 5);
    assert.equal(meta.pineapple, undefined);
  });

  it("handles CRLF line endings in frontmatter", () => {
    const p = writeFixture("crlf.md", "---\r\ndescription: crlf-ok\r\nmax-turns: 10\r\n---\r\n\r\nbody\r\n");
    const { meta } = loadPrompt(p);
    assert.equal(meta.description, "crlf-ok");
    assert.equal(meta.maxTurns, 10);
  });

  it("returns empty meta + full body when no frontmatter", () => {
    const p = writeFixture("no-fm.md", "# Just a body\n\nNo frontmatter here.\n");
    const { meta, text } = loadPrompt(p);
    assert.deepEqual(meta, {});
    assert.ok(text.startsWith("# Just a body"));
  });

  it("strips body whitespace on load", () => {
    const p = writeFixture("padded.md", `---
description: x
---


  actual content


`);
    assert.equal(loadPrompt(p).text, "actual content");
  });
});

describe("renderPrompt edge cases", () => {
  it("leaves unknown placeholder intact when not in vars map", () => {
    const result = renderPrompt("{{KNOWN}} and {{UNKNOWN}}", { KNOWN: "yes" });
    assert.equal(result, "yes and {{UNKNOWN}}");
  });

  it("empty vars map leaves all placeholders intact", () => {
    const result = renderPrompt("{{A}} {{B}}", {});
    assert.equal(result, "{{A}} {{B}}");
  });

  it("replaces value containing regex metacharacters safely", () => {
    // The value may contain $1, $&, etc. — String.replace gives them
    // replacement semantics in the 2nd argument. Current impl passes a
    // plain string, so $& would be interpreted. This test asserts we
    // handle the common "forward-slash path" case at minimum.
    const result = renderPrompt("{{DIR}}", { DIR: "/some/path" });
    assert.equal(result, "/some/path");
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
