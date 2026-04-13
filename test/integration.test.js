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
