const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { deleteOutput, removeCommand } = require("../dist/remove");

let tmp;
const write = (rel, body = "x") => {
  const full = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
  return full;
};
const exists = (rel) => fs.existsSync(path.join(tmp, rel));

beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), "harness-remove-")); });
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

describe("deleteOutput — literal paths", () => {
  it("deletes the named file and reports it", () => {
    write("CLAUDE.md");
    assert.deepEqual(deleteOutput(tmp, "CLAUDE.md"), ["CLAUDE.md"]);
    assert.equal(exists("CLAUDE.md"), false);
  });

  it("returns empty and deletes nothing when the path is absent", () => {
    write("CLAUDE.md");
    assert.deepEqual(deleteOutput(tmp, "docs/NOPE.md"), []);
    assert.equal(exists("CLAUDE.md"), true);
  });

  it("leaves siblings alone", () => {
    write("docs/VERIFY.md");
    write("docs/PLANS.md");
    deleteOutput(tmp, "docs/VERIFY.md");
    assert.equal(exists("docs/VERIFY.md"), false);
    assert.equal(exists("docs/PLANS.md"), true, "a sibling must survive");
  });
});

describe("deleteOutput — globs", () => {
  it("deletes only matches of a single-segment wildcard", () => {
    write(".claude/hooks/gate-deploy.sh");
    write(".claude/hooks/gate-data.sh");
    write(".claude/hooks/lint-naming.sh");

    const deleted = deleteOutput(tmp, ".claude/hooks/gate-*.sh").sort();
    assert.deepEqual(deleted, [".claude/hooks/gate-data.sh", ".claude/hooks/gate-deploy.sh"]);
    assert.equal(exists(".claude/hooks/lint-naming.sh"), true,
      "a non-matching hook in the same directory must survive");
  });

  it("does not escape the directory the pattern names", () => {
    write(".claude/rules/testing.md");
    write("docs/testing.md");
    deleteOutput(tmp, ".claude/rules/*.md");
    assert.equal(exists(".claude/rules/testing.md"), false);
    assert.equal(exists("docs/testing.md"), true, "same basename elsewhere must survive");
  });

  it("returns empty when the pattern's static prefix does not exist", () => {
    write("CLAUDE.md");
    assert.deepEqual(deleteOutput(tmp, "evals/*.json"), []);
    assert.equal(exists("CLAUDE.md"), true);
  });

  it("matches nested paths through a recursive wildcard without taking the root", () => {
    write("docs/specs/one.md");
    write("docs/specs/nested/two.md");
    write("docs/PLANS.md");
    deleteOutput(tmp, "docs/specs/**/*.md");
    assert.equal(exists("docs/PLANS.md"), true, "sibling doc must survive");
    assert.equal(fs.existsSync(tmp), true, "the project root must never be removed");
  });
});

describe("removeCommand", () => {
  it("reports nothing to remove on an empty project and exits 0", async () => {
    const code = await removeCommand([tmp]);
    assert.equal(code, 0);
  });

  it("--dry-run deletes nothing", async () => {
    write("CLAUDE.md");
    write("docs/VERIFY.md");
    const code = await removeCommand(["--dry-run", tmp]);
    assert.equal(code, 0);
    assert.equal(exists("CLAUDE.md"), true, "dry run must not delete");
    assert.equal(exists("docs/VERIFY.md"), true, "dry run must not delete");
  });
});
