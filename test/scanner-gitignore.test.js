const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { ensureGitignore, selectTasks } = require("../dist/scanner");
const { TASK_MANIFEST } = require("../dist/types");

describe("ensureGitignore", () => {
  let tmpDir;
  let gitignorePath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-harness-gitignore-test-"));
    gitignorePath = path.join(tmpDir, ".gitignore");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const sentinelCount = () =>
    (fs.readFileSync(gitignorePath, "utf-8").match(/claude-harness: local state/g) || []).length;

  it("creates .gitignore when absent", () => {
    ensureGitignore(tmpDir);
    assert.ok(fs.existsSync(gitignorePath));
    assert.equal(sentinelCount(), 1);
    assert.match(fs.readFileSync(gitignorePath, "utf-8"), /\.claude-harness\/\n/);
  });

  it("appends to existing .gitignore", () => {
    fs.writeFileSync(gitignorePath, "node_modules/\n");
    ensureGitignore(tmpDir);
    const content = fs.readFileSync(gitignorePath, "utf-8");
    assert.ok(content.startsWith("node_modules/\n"), "preserves prior content");
    assert.equal(sentinelCount(), 1);
  });

  it("is idempotent — second call does not duplicate", () => {
    ensureGitignore(tmpDir);
    ensureGitignore(tmpDir);
    assert.equal(sentinelCount(), 1);
  });

  for (const [label, line] of [
    ["trailing slash", ".claude-harness/"],
    ["no trailing slash", ".claude-harness"],
    ["leading + trailing slash", "/.claude-harness/"],
    ["leading slash only", "/.claude-harness"],
    ["whitespace around", "  .claude-harness/  "],
  ]) {
    it(`detects existing entry: ${label}`, () => {
      fs.writeFileSync(gitignorePath, `node_modules/\n${line}\n`);
      ensureGitignore(tmpDir);
      assert.equal(sentinelCount(), 0, "should not append when already ignored");
      const content = fs.readFileSync(gitignorePath, "utf-8");
      assert.ok(!content.includes("claude-harness: local state"));
    });
  }

  it("ignores commented-out entry (still appends — comment is not active)", () => {
    fs.writeFileSync(gitignorePath, "node_modules/\n# .claude-harness/\n");
    ensureGitignore(tmpDir);
    assert.equal(sentinelCount(), 1, "commented line is not an active ignore");
  });

  it("adds newline separator when existing .gitignore has no trailing newline", () => {
    fs.writeFileSync(gitignorePath, "node_modules/");
    ensureGitignore(tmpDir);
    const content = fs.readFileSync(gitignorePath, "utf-8");
    assert.ok(content.startsWith("node_modules/\n"), "should insert newline");
  });
});

describe("selectTasks", () => {
  it("returns the full manifest when only is null", () => {
    const tasks = selectTasks(null);
    assert.equal(tasks.length, TASK_MANIFEST.length);
  });

  it("returns the full manifest when only is an empty array", () => {
    const tasks = selectTasks([]);
    assert.equal(tasks.length, TASK_MANIFEST.length);
  });

  it("filters by id", () => {
    const tasks = selectTasks(["claude-md", "settings-json"]);
    assert.equal(tasks.length, 2);
    const ids = tasks.map((t) => t.id).sort();
    assert.deepEqual(ids, ["claude-md", "settings-json"]);
  });

  it("silently drops ids not in the manifest", () => {
    const tasks = selectTasks(["claude-md", "not-a-real-task"]);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].id, "claude-md");
  });

  it("returns empty array when no ids match", () => {
    const tasks = selectTasks(["does-not-exist", "neither-does-this"]);
    assert.equal(tasks.length, 0);
  });

  it("preserves manifest order regardless of input order", () => {
    // Pick three tasks in reverse manifest order.
    const last = TASK_MANIFEST[TASK_MANIFEST.length - 1].id;
    const mid = TASK_MANIFEST[Math.floor(TASK_MANIFEST.length / 2)].id;
    const first = TASK_MANIFEST[0].id;
    const tasks = selectTasks([last, first, mid]);
    const expectedOrder = TASK_MANIFEST
      .filter((t) => [last, first, mid].includes(t.id))
      .map((t) => t.id);
    assert.deepEqual(tasks.map((t) => t.id), expectedOrder);
  });

  it("does not duplicate when id is repeated in `only`", () => {
    const tasks = selectTasks(["claude-md", "claude-md", "claude-md"]);
    assert.equal(tasks.length, 1);
  });
});
