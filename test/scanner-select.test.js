const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { selectTasks } = require("../dist/scanner");
const { TASK_MANIFEST } = require("../dist/types");

// loadPrompt accepts absolute paths, so a fixture prompt can stand in for a
// bundled one and let the disabled-flag tests own their own data.
let fxDir;
before(() => { fxDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-select-fx-")); });
after(() => { fs.rmSync(fxDir, { recursive: true, force: true }); });
const writeFixturePrompt = (name, body) => {
  const p = path.join(fxDir, name);
  fs.writeFileSync(p, body);
  return p;
};

describe("selectTasks", () => {
  // Compute how many tasks have disabled: true in their frontmatter.
  // Done once here so every test in this suite can reference it.
  const { loadPrompt } = require("../dist/prompt");
  const disabledCount = TASK_MANIFEST.reduce((n, t) => {
    try { return loadPrompt(t.promptFile).meta.disabled ? n + 1 : n; } catch { return n; }
  }, 0);

  it("returns the manifest minus disabled tasks when only is null", () => {
    const tasks = selectTasks(null);
    assert.equal(tasks.length, TASK_MANIFEST.length - disabledCount);
  });

  it("returns the manifest minus disabled tasks when only is an empty array", () => {
    const tasks = selectTasks([]);
    assert.equal(tasks.length, TASK_MANIFEST.length - disabledCount);
  });

  it("excludes tasks flagged disabled: true from normal runs", () => {
    // Fixture manifest, not the real one: this must keep testing the flag even
    // when no production task is parked.
    const enabled = writeFixturePrompt("enabled.md", "---\ndescription: on\n---\nbody");
    const parked = writeFixturePrompt("parked.md", "---\ndescription: off\ndisabled: true\n---\nbody");
    const manifest = [
      { id: "enabled-task", promptFile: enabled },
      { id: "parked-task", promptFile: parked },
    ];

    const tasks = selectTasks(null, manifest);
    assert.deepEqual(tasks.map((t) => t.id), ["enabled-task"]);
  });

  it("--only bypasses the disabled flag (explicit override)", () => {
    const parked = writeFixturePrompt("parked2.md", "---\ndescription: off\ndisabled: true\n---\nbody");
    const manifest = [{ id: "parked-task", promptFile: parked }];

    const tasks = selectTasks(["parked-task"], manifest);
    assert.equal(tasks.length, 1, "--only must run a disabled task when named explicitly");
    assert.equal(tasks[0].id, "parked-task");
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
