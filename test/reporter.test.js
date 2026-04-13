const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { generateReport, writeReport } = require("../dist/reporter");
const { initState, computeStats } = require("../dist/state");

const testConfig = {
  parallel: 4,
  timeout: 300,
  maxRetries: 2,
  maxTurns: 30,
  model: null,
  verbose: false,
};

describe("generateReport", () => {
  it("includes project header and run ID", () => {
    const state = initState("/tmp/my-project", ["claude-md", "settings-json"], testConfig);
    const report = generateReport(state);
    assert.ok(report.includes("# claude-harness Setup Report"));
    assert.ok(report.includes("/tmp/my-project"));
    assert.ok(report.includes(state.runId));
  });

  it("includes stats table with correct counts", () => {
    const state = initState("/tmp/p", ["claude-md", "settings-json", "architecture-md"], testConfig);
    state.tasks["claude-md"].status = "COMPLETED";
    state.tasks["claude-md"].attempts = 1;
    state.tasks["settings-json"].status = "FAILED";
    state.tasks["settings-json"].attempts = 2;
    state.tasks["settings-json"].lastError = "rate_limit";
    state.stats = computeStats(state.tasks);

    const report = generateReport(state);
    assert.ok(report.includes("Total tasks"));
    assert.ok(report.includes("Completed"));
    assert.ok(report.includes("Failed"));
  });

  it("lists completed tasks", () => {
    const state = initState("/tmp/p", ["claude-md", "settings-json"], testConfig);
    state.tasks["claude-md"].status = "COMPLETED";
    state.tasks["claude-md"].durationMs = 12000;

    const report = generateReport(state);
    assert.ok(report.includes("Completed Tasks"));
    assert.ok(report.includes("claude-md"));
  });

  it("lists failed tasks with error", () => {
    const state = initState("/tmp/p", ["claude-md", "settings-json"], testConfig);
    state.tasks["claude-md"].status = "FAILED";
    state.tasks["claude-md"].lastError = "timeout_exceeded";

    const report = generateReport(state);
    assert.ok(report.includes("Failed"));
    assert.ok(report.includes("claude-md"));
  });

  it("includes retry suggestion when tasks failed", () => {
    const state = initState("/tmp/p", ["claude-md"], testConfig);
    state.tasks["claude-md"].status = "FAILED";

    const report = generateReport(state);
    assert.ok(report.includes("--resume") || report.includes("--retry"));
  });
});

describe("writeReport", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-reporter-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes setup-report.md to output dir", () => {
    const state = initState("/tmp/project", ["claude-md"], testConfig);
    state.tasks["claude-md"].status = "COMPLETED";

    const reportPath = writeReport(tmpDir, state);
    assert.ok(fs.existsSync(reportPath));
    assert.ok(reportPath.endsWith("setup-report.md"));

    const content = fs.readFileSync(reportPath, "utf-8");
    assert.ok(content.includes("claude-harness Setup Report"));
  });

  it("returns the path to the written file", () => {
    const state = initState("/tmp/project", ["claude-md"], testConfig);
    const reportPath = writeReport(tmpDir, state);
    assert.equal(reportPath, path.join(tmpDir, "setup-report.md"));
  });
});
