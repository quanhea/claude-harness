const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { WorkerPool } = require("../dist/worker-pool");

const baseConfig = {
  parallel: 2,
  timeout: 5,
  maxRetries: 0,
  maxTurns: 5,
  model: null,
  verbose: false,
};

const TASK_IDS = ["claude-md", "settings-json", "architecture-md"];

function makePrompts(ids) {
  const m = new Map();
  for (const id of ids) {
    m.set(id, `task ${id} in {{PROJECT_DIR}}`);
  }
  return m;
}

describe("WorkerPool", () => {
  let tmpDir;
  let targetDir;
  let outputDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-harness-pool-test-"));
    targetDir = path.join(tmpDir, "project");
    outputDir = path.join(tmpDir, "output");
    fs.mkdirSync(targetDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("limits concurrency to configured value", async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const pool = new WorkerPool({
      tasks: TASK_IDS,
      prompts: makePrompts(TASK_IDS),
      concurrency: 2,
      targetDir,
      outputDir,
      config: baseConfig,
    });

    pool.on("start", () => {
      currentConcurrent++;
      if (currentConcurrent > maxConcurrent) {
        maxConcurrent = currentConcurrent;
      }
    });

    pool.on("done", () => {
      currentConcurrent--;
    });

    await pool.start();
    assert.ok(maxConcurrent <= 2, `Max concurrent was ${maxConcurrent}, expected <= 2`);
  });

  it("processes all tasks in the queue", async () => {
    const completed = [];
    const pool = new WorkerPool({
      tasks: TASK_IDS,
      prompts: makePrompts(TASK_IDS),
      concurrency: 2,
      targetDir,
      outputDir,
      config: baseConfig,
    });

    pool.on("done", (taskId) => {
      completed.push(taskId);
    });

    await pool.start();
    assert.equal(completed.length, 3);
    assert.ok(completed.includes("claude-md"));
    assert.ok(completed.includes("settings-json"));
    assert.ok(completed.includes("architecture-md"));
  });

  it("emits start and done events with task ID and worker index", async () => {
    const events = [];
    const pool = new WorkerPool({
      tasks: ["claude-md"],
      prompts: makePrompts(["claude-md"]),
      concurrency: 1,
      targetDir,
      outputDir,
      config: baseConfig,
    });

    pool.on("start", (taskId, idx) => {
      events.push({ type: "start", taskId, idx });
    });

    pool.on("done", (taskId, result, idx) => {
      events.push({ type: "done", taskId, idx, status: result.status });
    });

    await pool.start();
    assert.equal(events.length, 2);
    assert.equal(events[0].type, "start");
    assert.equal(events[0].taskId, "claude-md");
    assert.equal(events[1].type, "done");
    assert.equal(events[1].taskId, "claude-md");
  });

  it("stopAcceptingNew prevents new workers from launching", async () => {
    const completed = [];
    const pool = new WorkerPool({
      tasks: TASK_IDS,
      prompts: makePrompts(TASK_IDS),
      concurrency: 1,
      targetDir,
      outputDir,
      config: baseConfig,
    });

    pool.on("done", (taskId) => {
      completed.push(taskId);
      if (completed.length === 1) {
        pool.stopAcceptingNew();
      }
    });

    await pool.start();
    assert.ok(completed.length <= 2, `Expected <= 2 completed, got ${completed.length}`);
    assert.equal(pool.queueLength, 0);
  });

  it("killAll terminates all active workers", async () => {
    const pool = new WorkerPool({
      tasks: ["claude-md", "settings-json"],
      prompts: makePrompts(["claude-md", "settings-json"]),
      concurrency: 2,
      targetDir,
      outputDir,
      config: { ...baseConfig, timeout: 60 },
    });

    pool.on("start", () => {
      setTimeout(() => pool.killAll(), 50);
    });

    await pool.start();
    assert.equal(pool.activeCount, 0);
  });

  it("pause prevents new workers, resume restarts them", async () => {
    const events = [];
    const pool = new WorkerPool({
      tasks: TASK_IDS,
      prompts: makePrompts(TASK_IDS),
      concurrency: 1,
      targetDir,
      outputDir,
      config: baseConfig,
    });

    pool.on("done", (taskId) => {
      events.push(taskId);
      if (events.length === 1) {
        pool.pause();
        setTimeout(() => pool.resume(), 100);
      }
    });

    await pool.start();
    assert.equal(events.length, 3);
  });

  it("requeueTask puts task at front of queue", () => {
    const pool = new WorkerPool({
      tasks: ["claude-md", "settings-json"],
      prompts: makePrompts(["claude-md", "settings-json"]),
      concurrency: 1,
      targetDir,
      outputDir,
      config: baseConfig,
    });

    pool.requeueTask("99-extra");
    assert.equal(pool.queueLength, 3);
  });

  it("handles empty task list gracefully", async () => {
    const pool = new WorkerPool({
      tasks: [],
      prompts: new Map(),
      concurrency: 4,
      targetDir,
      outputDir,
      config: baseConfig,
    });

    let drained = false;
    pool.on("drain", () => { drained = true; });

    await pool.start();
    assert.ok(drained);
  });
});
