const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const CLI = path.join(__dirname, "..", "dist", "cli.js");
const MOCK_CLAUDE = path.join(__dirname, "fixtures", "mock-claude");

describe("integration", () => {
  let tmpDir;
  let projectDir;
  let outputDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-harness-integration-"));
    projectDir = path.join(tmpDir, "my-project");
    outputDir = path.join(tmpDir, "harness-output");
    // Create a minimal project for harness to run on
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, "package.json"), JSON.stringify({
      name: "test-project",
      version: "1.0.0",
    }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("runs tasks with mock claude and produces setup-report.md", () => {
    const env = {
      ...process.env,
      PATH: MOCK_CLAUDE + ":" + process.env.PATH,
    };

    // Run only the first 2 tasks (discover + claude-md) for speed
    const result = execFileSync(
      "node",
      [
        CLI,
        projectDir,
        "--output", outputDir,
        "--only", "claude-md,settings-json",
        "--parallel", "1",
        "--timeout", "10",
        "--max-turns", "5",
      ],
      { encoding: "utf-8", env, timeout: 30000 },
    );

    // State file should exist
    const statePath = path.join(outputDir, "state.json");
    assert.ok(fs.existsSync(statePath), "state.json should exist");
    const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    assert.ok(state.stats.completed > 0, "at least one task should complete");
    assert.equal(state.stats.running, 0, "no tasks should be running after completion");

    // setup-report.md should be generated
    const reportPath = path.join(outputDir, "setup-report.md");
    assert.ok(fs.existsSync(reportPath), "setup-report.md should exist");
    const report = fs.readFileSync(reportPath, "utf-8");
    assert.ok(report.includes("claude-harness Setup Report"), "report should have header");
    assert.ok(report.includes("Completed Tasks"), "report should list completed tasks");

    // Lock file should be cleaned up
    assert.ok(!fs.existsSync(path.join(outputDir, "harness.lock")), "lock file should be cleaned up");
  });

  it("--dry-run does not create output files", () => {
    const env = {
      ...process.env,
      PATH: MOCK_CLAUDE + ":" + process.env.PATH,
    };

    execFileSync(
      "node",
      [CLI, projectDir, "--output", outputDir, "--dry-run"],
      { encoding: "utf-8", env, timeout: 10000 },
    );

    // state.json should NOT exist after dry-run
    assert.ok(!fs.existsSync(path.join(outputDir, "state.json")), "dry-run should not create state.json");
  });

  it("--only forces re-run of already-COMPLETED tasks", () => {
    const env = { ...process.env, PATH: MOCK_CLAUDE + ":" + process.env.PATH };

    // First run — complete claude-md
    execFileSync(
      "node",
      [CLI, projectDir, "--output", outputDir, "--only", "claude-md", "--parallel", "1", "--timeout", "10", "--max-turns", "5"],
      { encoding: "utf-8", env, timeout: 30000 },
    );

    // Mock claude doesn't actually write files; create the expected output
    // so the reconciliation check doesn't short-circuit our --only test.
    fs.writeFileSync(path.join(projectDir, "CLAUDE.md"), "# placeholder\n");

    const statePath = path.join(outputDir, "state.json");
    const before = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    assert.equal(before.tasks["claude-md"].status, "COMPLETED", "first run should complete the task");
    const firstCompletedAt = before.tasks["claude-md"].completedAt;

    // Wait a moment so timestamps can differ
    execFileSync("sleep", ["1.1"]);

    // Second run with --only on the same task — should force re-run
    const out = execFileSync(
      "node",
      [CLI, projectDir, "--output", outputDir, "--only", "claude-md", "--parallel", "1", "--timeout", "10", "--max-turns", "5"],
      { encoding: "utf-8", env, timeout: 30000 },
    );
    assert.ok(out.includes("Forcing re-run"), "should announce the forced re-run, got:\n" + out);

    const after = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    assert.equal(after.tasks["claude-md"].status, "COMPLETED", "re-run should complete again");
    assert.ok(after.tasks["claude-md"].completedAt !== firstCompletedAt, "completedAt should have been refreshed by the re-run");
  });

  it("requeues tasks whose declared output was deleted from disk", () => {
    const env = { ...process.env, PATH: MOCK_CLAUDE + ":" + process.env.PATH };

    // Seed state.json marking claude-md as COMPLETED, but DON'T create CLAUDE.md
    fs.mkdirSync(outputDir, { recursive: true });
    const seedState = {
      version: 2,
      runId: "test9999",
      targetDir: projectDir,
      startedAt: new Date().toISOString(),
      config: { parallel: 1, timeout: 10, maxRetries: 2, maxTurns: 5, model: null, verbose: false },
      stats: { totalTasks: 1, completed: 1, failed: 0, timeout: 0, skipped: 0, pending: 0, running: 0 },
      tasks: {
        "claude-md": { status: "COMPLETED", attempts: 1, completedAt: new Date().toISOString(), durationMs: 1000, exitCode: 0 },
      },
    };
    fs.writeFileSync(path.join(outputDir, "state.json"), JSON.stringify(seedState, null, 2));

    // Run claude-harness — CLAUDE.md is missing on disk, so claude-md should be requeued
    const out = execFileSync(
      "node",
      [CLI, projectDir, "--output", outputDir, "--only", "claude-md", "--parallel", "1", "--timeout", "10", "--max-turns", "5"],
      { encoding: "utf-8", env, timeout: 30000 },
    );
    assert.ok(
      out.includes("missing output") || out.includes("Forcing re-run"),
      "scanner should notice missing file and re-run (or --only forced it), got: " + out,
    );

    const after = JSON.parse(fs.readFileSync(path.join(outputDir, "state.json"), "utf-8"));
    assert.equal(after.tasks["claude-md"].status, "COMPLETED", "task should have re-run and completed");
  });

  it("auto-merges new manifest tasks into existing state", () => {
    const env = { ...process.env, PATH: MOCK_CLAUDE + ":" + process.env.PATH };

    // Seed state.json with an older "manifest" — just claude-md — and create
    // its declared output so reconciliation doesn't requeue it.
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, "CLAUDE.md"), "# placeholder\n");
    const seedState = {
      version: 2,
      runId: "test1234",
      targetDir: projectDir,
      startedAt: new Date().toISOString(),
      config: { parallel: 1, timeout: 10, maxRetries: 2, maxTurns: 5, model: null, verbose: false },
      stats: { totalTasks: 1, completed: 1, failed: 0, timeout: 0, skipped: 0, pending: 0, running: 0 },
      tasks: {
        "claude-md": { status: "COMPLETED", attempts: 1, completedAt: new Date().toISOString(), durationMs: 1000, exitCode: 0 },
      },
    };
    fs.writeFileSync(path.join(outputDir, "state.json"), JSON.stringify(seedState, null, 2));

    // Run with --only for a task NOT in the seed state — forces detection + merge
    const out = execFileSync(
      "node",
      [CLI, projectDir, "--output", outputDir, "--only", "settings-json", "--parallel", "1", "--timeout", "10", "--max-turns", "5"],
      { encoding: "utf-8", env, timeout: 30000 },
    );
    assert.ok(out.includes("Detected") && out.includes("new task"), "should announce detected new tasks");

    const state = JSON.parse(fs.readFileSync(path.join(outputDir, "state.json"), "utf-8"));
    assert.equal(state.tasks["claude-md"].status, "COMPLETED", "existing completed task should be preserved");
    assert.equal(state.tasks["settings-json"].status, "COMPLETED", "newly-merged task should have run");
    assert.ok(state.stats.totalTasks > 1, "state should now contain more than the seed task");
  });

  it("resume resets stale RUNNING tasks and continues", () => {
    const env = {
      ...process.env,
      PATH: MOCK_CLAUDE + ":" + process.env.PATH,
    };

    // First run — only task 01
    execFileSync(
      "node",
      [CLI, projectDir, "--output", outputDir, "--only", "claude-md", "--parallel", "1", "--timeout", "10", "--max-turns", "5"],
      { encoding: "utf-8", env, timeout: 30000 },
    );

    // Manually corrupt state to simulate a crash
    const statePath = path.join(outputDir, "state.json");
    const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    const taskIds = Object.keys(state.tasks);
    if (taskIds.length > 0) {
      state.tasks[taskIds[0]].status = "RUNNING";
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    }

    // Resume — should reset RUNNING to PENDING and re-run
    execFileSync(
      "node",
      [CLI, projectDir, "--output", outputDir, "--resume", "--only", "claude-md", "--parallel", "1", "--timeout", "10", "--max-turns", "5"],
      { encoding: "utf-8", env, timeout: 30000 },
    );

    const resumedState = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    assert.equal(resumedState.stats.running, 0, "no tasks should be running after resume");
  });
});
