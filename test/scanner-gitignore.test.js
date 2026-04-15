const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { ensureGitignore } = require("../dist/scanner");

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
