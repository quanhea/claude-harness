const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { TASK_MANIFEST } = require("../dist/types");
const { loadPrompt } = require("../dist/prompt");
const { outputExists } = require("../dist/scanner");
const { installSeedSkills, seedSkillNames } = require("../dist/seed-skills");

// A task's `outputs` is the disk-reconciliation signal: when every declared
// path is present, the scanner marks the task COMPLETED without running it.
// That is only sound if the paths could ONLY have been produced by that task.
// A glob satisfied by a file from any other source silently disables the task.
describe("declared outputs are a sound completion signal", () => {
  let tmp;
  before(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), "harness-outputs-")); });
  after(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  const outputsFor = (task) => {
    try { return loadPrompt(task.promptFile).meta.outputs ?? []; } catch { return []; }
  };

  it("no task is satisfied by the seed skills alone", () => {
    // The seed installer runs before reconciliation, so any task whose outputs
    // these satisfy would be marked done on a completely empty project.
    installSeedSkills(tmp);
    assert.ok(seedSkillNames().length > 0, "precondition: seeds exist");

    const falselySatisfied = TASK_MANIFEST.filter((task) => {
      const outputs = outputsFor(task);
      if (outputs.length === 0) return false;
      return outputs.every((p) => outputExists(tmp, p));
    }).map((t) => t.id);

    assert.deepEqual(
      falselySatisfied, [],
      "these tasks would be skipped on an empty project because the seed skills " +
      "satisfy their declared outputs — narrow the glob or drop `outputs`",
    );
  });

  it("no two tasks declare the same output path", () => {
    const owner = new Map();
    const collisions = [];
    for (const task of TASK_MANIFEST) {
      for (const p of outputsFor(task)) {
        if (owner.has(p)) collisions.push(`${p}: ${owner.get(p)} and ${task.id}`);
        else owner.set(p, task.id);
      }
    }
    assert.deepEqual(
      collisions, [],
      "two tasks claiming one path means --remove deletes the other's work and " +
      "reconciliation completes whichever runs second",
    );
  });

  it("every declared output is under the project, never an absolute or escaping path", () => {
    const bad = [];
    for (const task of TASK_MANIFEST) {
      for (const p of outputsFor(task)) {
        if (path.isAbsolute(p) || p.split("/").includes("..")) bad.push(`${task.id}: ${p}`);
      }
    }
    assert.deepEqual(bad, [], "outputs are deleted by --remove; they must stay inside the target");
  });
});
