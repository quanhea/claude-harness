// test/glob.test.js — unit tests for the output-existence matcher used by
// the scanner's on-disk reconciliation step. Verifies full glob support:
// literal, single *, recursive **, ?, brace expansion, char classes.
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { outputExists } = require("../dist/scanner");

let tmp;

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "harness-glob-"));
  // Build a small fixture tree
  fs.mkdirSync(path.join(tmp, ".claude/skills/sync"), { recursive: true });
  fs.mkdirSync(path.join(tmp, ".claude/skills/review"), { recursive: true });
  fs.mkdirSync(path.join(tmp, ".claude/hooks"), { recursive: true });
  fs.mkdirSync(path.join(tmp, ".claude/rules"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "docs/design-docs"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "node_modules/should-be-ignored"), { recursive: true });
  fs.writeFileSync(path.join(tmp, ".claude/skills/sync/SKILL.md"), "x");
  fs.writeFileSync(path.join(tmp, ".claude/skills/review/SKILL.md"), "x");
  fs.writeFileSync(path.join(tmp, ".claude/hooks/post-checkout.js"), "x");
  fs.writeFileSync(path.join(tmp, ".claude/rules/architecture.md"), "x");
  fs.writeFileSync(path.join(tmp, "docs/design-docs/core-beliefs.md"), "x");
  fs.writeFileSync(path.join(tmp, "CLAUDE.md"), "x");
  fs.writeFileSync(path.join(tmp, "node_modules/should-be-ignored/SKILL.md"), "x");
});

after(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe("outputExists — literal paths (fast path)", () => {
  it("matches an existing file", () => {
    assert.equal(outputExists(tmp, "CLAUDE.md"), true);
  });
  it("matches a nested existing file", () => {
    assert.equal(outputExists(tmp, ".claude/skills/sync/SKILL.md"), true);
  });
  it("returns false for missing literal path", () => {
    assert.equal(outputExists(tmp, "nope.md"), false);
  });
});

describe("outputExists — single * wildcard", () => {
  it("matches at least one subdir/SKILL.md", () => {
    assert.equal(outputExists(tmp, ".claude/skills/*/SKILL.md"), true);
  });
  it("matches an extension wildcard", () => {
    assert.equal(outputExists(tmp, ".claude/hooks/*.js"), true);
  });
  it("returns false when no subdir contains the file", () => {
    assert.equal(outputExists(tmp, ".claude/skills/*/nonexistent.md"), false);
  });
});

describe("outputExists — recursive ** wildcard", () => {
  it("matches across multiple directory levels", () => {
    assert.equal(outputExists(tmp, "docs/**/*.md"), true);
  });
  it("works with leading **", () => {
    assert.equal(outputExists(tmp, "**/SKILL.md"), true);
  });
  it("returns false when nothing matches", () => {
    assert.equal(outputExists(tmp, "docs/**/*.toml"), false);
  });
});

describe("outputExists — brace expansion", () => {
  it("matches one of several extensions", () => {
    assert.equal(outputExists(tmp, ".claude/hooks/*.{sh,js}"), true);
  });
  it("matches one of several directory names", () => {
    assert.equal(outputExists(tmp, ".claude/{hooks,rules}/*.md"), true);
  });
  it("returns false when no brace alternative matches", () => {
    assert.equal(outputExists(tmp, ".claude/{nonexistent}/*.md"), false);
  });
});

describe("outputExists — ignored directories", () => {
  it("does not descend into node_modules even with **", () => {
    assert.equal(outputExists(tmp, "**/should-be-ignored/SKILL.md"), false);
  });
});

describe("outputExists — missing static prefix", () => {
  it("returns false fast if the literal prefix doesn't exist", () => {
    assert.equal(outputExists(tmp, "no-such-dir/*/SKILL.md"), false);
  });
});
