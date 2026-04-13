const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  initState,
  computeStats,
  saveState,
  loadState,
  resetStaleRunning,
  resetFailed,
  mergeNewTasks,
  updateTaskStatus,
  getPendingTasks,
  markForRetry,
} = require("../dist/state");

const testConfig = {
  parallel: 4,
  timeout: 300,
  maxRetries: 2,
  maxTurns: 30,
  model: null,
  verbose: false,
};

const TASK_IDS = ["claude-md", "settings-json", "architecture-md"];

describe("initState", () => {
  it("creates state with all tasks PENDING", () => {
    const state = initState("/tmp/project", TASK_IDS, testConfig);
    assert.equal(state.version, 2);
    assert.equal(state.targetDir, "/tmp/project");
    assert.ok(state.runId);
    assert.ok(state.startedAt);
    assert.equal(Object.keys(state.tasks).length, 3);
    assert.equal(state.tasks["claude-md"].status, "PENDING");
    assert.equal(state.tasks["claude-md"].attempts, 0);
    assert.equal(state.stats.totalTasks, 3);
    assert.equal(state.stats.pending, 3);
  });
});

describe("computeStats", () => {
  it("counts each status correctly", () => {
    const tasks = {
      "claude-md":         { status: "COMPLETED",   attempts: 1 },
      "settings-json":     { status: "COMPLETED",   attempts: 1 },
      "architecture-md":   { status: "FAILED",      attempts: 2 },
      "docs-structure":    { status: "TIMEOUT",     attempts: 1 },
      "git-workflow":      { status: "SKIPPED",     attempts: 3 },
      "infrastructure-md": { status: "PENDING",     attempts: 0 },
      "quality-score":     { status: "RUNNING",     attempts: 1 },
      "plans":             { status: "INTERRUPTED", attempts: 1 },
    };
    const stats = computeStats(tasks);
    assert.equal(stats.totalTasks, 8);
    assert.equal(stats.completed, 2);
    assert.equal(stats.failed, 1);
    assert.equal(stats.timeout, 1);
    assert.equal(stats.skipped, 1);
    assert.equal(stats.pending, 2); // PENDING + INTERRUPTED
    assert.equal(stats.running, 1);
  });
});

describe("saveState / loadState round-trip", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-harness-state-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("saves and loads state identically", () => {
    const state = initState("/tmp/project", ["claude-md", "settings-json"], testConfig);
    state.tasks["claude-md"].status = "COMPLETED";
    state.tasks["claude-md"].attempts = 1;
    state.tasks["claude-md"].durationMs = 5000;

    saveState(state, tmpDir);

    const loaded = loadState(tmpDir);
    assert.ok(loaded);
    assert.equal(loaded.runId, state.runId);
    assert.equal(loaded.tasks["claude-md"].status, "COMPLETED");
    assert.equal(loaded.tasks["claude-md"].durationMs, 5000);
    assert.equal(loaded.tasks["settings-json"].status, "PENDING");
    assert.equal(loaded.stats.completed, 1);
    assert.equal(loaded.stats.pending, 1);
  });

  it("atomic write does not corrupt on valid write", () => {
    const state = initState("/tmp/project", ["claude-md"], testConfig);
    saveState(state, tmpDir);

    // Verify no .tmp file left behind
    const tmpFile = path.join(tmpDir, "state.json.tmp");
    assert.ok(!fs.existsSync(tmpFile));

    // Verify state.json is valid JSON
    const raw = fs.readFileSync(path.join(tmpDir, "state.json"), "utf-8");
    assert.doesNotThrow(() => JSON.parse(raw));
  });

  it("returns null when no state file exists", () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "empty-"));
    const loaded = loadState(emptyDir);
    assert.equal(loaded, null);
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });
});

describe("resetStaleRunning", () => {
  it("resets RUNNING and INTERRUPTED to PENDING", () => {
    const state = initState("/tmp/p", ["claude-md", "settings-json", "architecture-md", "docs-structure"], testConfig);
    state.tasks["claude-md"].status = "RUNNING";
    state.tasks["settings-json"].status = "INTERRUPTED";
    state.tasks["architecture-md"].status = "COMPLETED";
    state.tasks["docs-structure"].status = "PENDING";

    const count = resetStaleRunning(state);
    assert.equal(count, 2);
    assert.equal(state.tasks["claude-md"].status, "PENDING");
    assert.equal(state.tasks["settings-json"].status, "PENDING");
    assert.equal(state.tasks["architecture-md"].status, "COMPLETED");
    assert.equal(state.stats.pending, 3);
    assert.equal(state.stats.completed, 1);
  });
});

describe("resetFailed", () => {
  it("resets FAILED, TIMEOUT, and SKIPPED to PENDING with attempts=0", () => {
    const ids = ["claude-md", "settings-json", "architecture-md", "docs-structure", "git-workflow"];
    const state = initState("/tmp/p", ids, testConfig);
    state.tasks["claude-md"].status = "FAILED";
    state.tasks["claude-md"].attempts = 2;
    state.tasks["settings-json"].status = "TIMEOUT";
    state.tasks["settings-json"].attempts = 1;
    state.tasks["architecture-md"].status = "SKIPPED";
    state.tasks["architecture-md"].attempts = 3;
    state.tasks["docs-structure"].status = "COMPLETED";
    state.tasks["git-workflow"].status = "PENDING";

    const count = resetFailed(state);
    assert.equal(count, 3);
    assert.equal(state.tasks["claude-md"].status, "PENDING");
    assert.equal(state.tasks["claude-md"].attempts, 0);
    assert.equal(state.tasks["settings-json"].status, "PENDING");
    assert.equal(state.tasks["settings-json"].attempts, 0);
    assert.equal(state.tasks["architecture-md"].status, "PENDING");
    assert.equal(state.tasks["architecture-md"].attempts, 0);
    assert.equal(state.tasks["docs-structure"].status, "COMPLETED");
    assert.equal(state.tasks["git-workflow"].status, "PENDING");
    assert.equal(state.stats.pending, 4);
    assert.equal(state.stats.completed, 1);
  });

  it("returns 0 when no failed tasks", () => {
    const state = initState("/tmp/p", ["claude-md"], testConfig);
    state.tasks["claude-md"].status = "COMPLETED";
    const count = resetFailed(state);
    assert.equal(count, 0);
  });
});

describe("mergeNewTasks", () => {
  it("adds new tasks as PENDING without touching existing", () => {
    const state = initState("/tmp/p", ["claude-md", "settings-json"], testConfig);
    state.tasks["claude-md"].status = "COMPLETED";
    state.tasks["claude-md"].attempts = 1;

    const count = mergeNewTasks(state, ["claude-md", "settings-json", "architecture-md", "docs-structure"]);
    assert.equal(count, 2);
    assert.equal(state.tasks["claude-md"].status, "COMPLETED"); // untouched
    assert.equal(state.tasks["claude-md"].attempts, 1);
    assert.equal(state.tasks["architecture-md"].status, "PENDING");
    assert.equal(state.tasks["architecture-md"].attempts, 0);
    assert.equal(state.tasks["docs-structure"].status, "PENDING");
    assert.equal(state.stats.totalTasks, 4);
  });

  it("returns 0 when no new tasks", () => {
    const state = initState("/tmp/p", ["claude-md"], testConfig);
    const count = mergeNewTasks(state, ["claude-md"]);
    assert.equal(count, 0);
  });
});

describe("updateTaskStatus", () => {
  it("updates status and extra fields", () => {
    const state = initState("/tmp/p", ["claude-md"], testConfig);
    updateTaskStatus(state, "claude-md", "RUNNING", {
      startedAt: "2026-01-01T00:00:00Z",
    });
    assert.equal(state.tasks["claude-md"].status, "RUNNING");
    assert.equal(state.tasks["claude-md"].startedAt, "2026-01-01T00:00:00Z");
    assert.equal(state.stats.running, 1);
  });

  it("ignores unknown task IDs", () => {
    const state = initState("/tmp/p", ["claude-md"], testConfig);
    assert.doesNotThrow(() => updateTaskStatus(state, "99-nonexistent", "FAILED"));
  });
});

describe("getPendingTasks", () => {
  it("returns only PENDING tasks", () => {
    const state = initState("/tmp/p", ["claude-md", "settings-json", "architecture-md"], testConfig);
    state.tasks["settings-json"].status = "COMPLETED";
    const pending = getPendingTasks(state);
    assert.ok(pending.includes("claude-md"));
    assert.ok(pending.includes("architecture-md"));
    assert.ok(!pending.includes("settings-json"));
  });
});

describe("markForRetry", () => {
  it("resets to PENDING when attempts < maxRetries", () => {
    const state = initState("/tmp/p", ["claude-md"], testConfig);
    state.tasks["claude-md"].status = "FAILED";
    state.tasks["claude-md"].attempts = 1;
    markForRetry(state, "claude-md", 2);
    assert.equal(state.tasks["claude-md"].status, "PENDING");
  });

  it("marks SKIPPED when attempts >= maxRetries", () => {
    const state = initState("/tmp/p", ["claude-md"], testConfig);
    state.tasks["claude-md"].status = "FAILED";
    state.tasks["claude-md"].attempts = 2;
    markForRetry(state, "claude-md", 2);
    assert.equal(state.tasks["claude-md"].status, "SKIPPED");
  });
});
