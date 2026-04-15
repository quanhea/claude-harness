// Tests for the scanner's bidirectional disk-reconciliation logic, focusing on
// the always-run behavior introduced for tasks like claude-md that must
// re-run on every invocation even when their output already exists on disk.
//
// We exercise reconciliation indirectly: run setup() with --dry-run=false,
// --timeout=1 (so claude times out fast), and inspect state.json + console
// output to verify that the reconciliation decisions were made correctly.
//
// For always-run assertions we also use outputExists + a real fixture tree
// plus direct inspection of the scanner's exported helpers.

const { describe, it, before, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { outputExists, selectTasks } = require("../dist/scanner");
const { loadPrompt } = require("../dist/prompt");
const { TASK_MANIFEST } = require("../dist/types");

// ---------------------------------------------------------------------------
// always-run detection via frontmatter
// ---------------------------------------------------------------------------

describe("always-run frontmatter", () => {
  it("claude-md is the only task with alwaysRun in the current manifest", () => {
    const alwaysRunTasks = TASK_MANIFEST
      .map((t) => ({ id: t.id, meta: loadPrompt(t.promptFile).meta }))
      .filter((t) => t.meta.alwaysRun === true)
      .map((t) => t.id);

    // If you add more always-run tasks later, update this assertion.
    assert.deepEqual(alwaysRunTasks, ["claude-md"]);
  });

  it("all other tasks do NOT have alwaysRun set", () => {
    const unexpected = TASK_MANIFEST
      .filter((t) => t.id !== "claude-md")
      .map((t) => ({ id: t.id, meta: loadPrompt(t.promptFile).meta }))
      .filter((t) => t.meta.alwaysRun === true);
    assert.equal(unexpected.length, 0, `Unexpected always-run: ${unexpected.map((t) => t.id).join(", ")}`);
  });
});

// ---------------------------------------------------------------------------
// Reconciliation via setup() — capture console to observe decisions
// ---------------------------------------------------------------------------

// Minimal substitute for a real project: just the files needed to trigger
// each reconciliation branch.
let tmpProject;
let tmpOutput;
let capturedLogs;
let origLog;

function startCapture() {
  capturedLogs = [];
  origLog = console.log;
  console.log = (...args) => capturedLogs.push(args.join(" "));
}
function stopCapture() {
  if (origLog) { console.log = origLog; origLog = null; }
}
function logsInclude(sub) {
  return capturedLogs.some((l) => l.includes(sub));
}

before(() => {
  // Suppress console.error from preflight / lock messages globally.
  // We restore it in stopCapture per test.
});

beforeEach(() => {
  tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "harness-reconcile-proj-"));
  tmpOutput  = fs.mkdtempSync(path.join(os.tmpdir(), "harness-reconcile-out-"));
  // Make it look like a git repo so preflight passes.
  fs.mkdirSync(path.join(tmpProject, ".git"));
  fs.mkdirSync(path.join(tmpProject, ".git", "refs"));
  fs.writeFileSync(path.join(tmpProject, ".git", "HEAD"), "ref: refs/heads/main\n");
  fs.writeFileSync(path.join(tmpProject, "package.json"), '{"name":"test","version":"0.0.1"}');
});

afterEach(() => {
  stopCapture();
  fs.rmSync(tmpProject, { recursive: true, force: true });
  fs.rmSync(tmpOutput,  { recursive: true, force: true });
});

async function runSetup(opts = {}) {
  // Fresh require each time to avoid module-level state bleeding between tests.
  const mod = path.resolve(__dirname, "../dist/scanner");
  delete require.cache[mod];
  const { setup } = require(mod);

  return setup({
    targetDir: tmpProject,
    targetArg: null,
    outputDir: tmpOutput,
    parallel: 4,
    timeout: 1,         // times out fast — we don't care about claude output
    maxRetries: 0,
    maxTurns: 5,
    model: null,
    only:     opts.only  ?? null,
    resume:   opts.resume ?? false,
    retry:    opts.retry  ?? false,
    dryRun:   false,
    force:    true,     // bypass lock
    verbose:  false,
    ...opts,
  });
}

describe("always-run reconciliation", () => {
  it("always-run task is NOT promoted to COMPLETED even when its output exists", async () => {
    // Plant CLAUDE.md on disk as if a teammate committed it.
    fs.writeFileSync(path.join(tmpProject, "CLAUDE.md"), "# planted\n");

    startCapture();
    await runSetup();
    stopCapture();

    // The "marking completed" log should not mention claude-md.
    const markingLine = capturedLogs.find((l) => l.includes("marking completed"));
    assert.ok(
      !markingLine || !markingLine.includes("claude-md"),
      `claude-md should not appear in 'marking completed', got: ${markingLine}`,
    );

    // The real proof: state shows claude-md was actually attempted (TIMEOUT/FAILED),
    // not skipped as COMPLETED by the reconciler.
    const state = JSON.parse(fs.readFileSync(path.join(tmpOutput, "state.json"), "utf-8"));
    const status = state.tasks["claude-md"]?.status;
    assert.ok(
      status === "TIMEOUT" || status === "FAILED",
      `Expected claude-md to have been attempted (TIMEOUT/FAILED after 1s), got ${status}`,
    );
  });

  it("emits 'Always-run task(s) reset' when resuming a run where claude-md was COMPLETED", async () => {
    // Simulate a prior run: write state.json with claude-md as COMPLETED,
    // and plant CLAUDE.md on disk.
    fs.writeFileSync(path.join(tmpProject, "CLAUDE.md"), "# prior\n");
    const priorState = {
      version: 2,
      runId: "prior-run",
      targetDir: tmpProject,
      startedAt: new Date().toISOString(),
      config: { parallel: 4, timeout: 300, maxRetries: 0, maxTurns: 5, model: null, verbose: false },
      stats: { totalTasks: 28, pending: 0, running: 0, completed: 28, failed: 0, timeout: 0, skipped: 0, interrupted: 0 },
      tasks: {},
    };
    // Populate tasks: all COMPLETED, including claude-md.
    const { TASK_MANIFEST: TM } = require("../dist/types");
    for (const t of TM) {
      priorState.tasks[t.id] = { status: "COMPLETED", attempts: 1, completedAt: new Date().toISOString() };
    }
    fs.mkdirSync(tmpOutput, { recursive: true });
    fs.writeFileSync(path.join(tmpOutput, "state.json"), JSON.stringify(priorState));

    startCapture();
    await runSetup({ resume: true });
    stopCapture();

    assert.ok(
      logsInclude("Always-run task(s) reset") || logsInclude("reset to pending"),
      `Expected always-run reset log, got: ${capturedLogs.slice(0, 10).join(" | ")}`,
    );
  });

  it("always-run task still respects --only exclusion", async () => {
    // Run with --only targeting a different task. claude-md should not be
    // attempted even though it's always-run, because --only restricts the
    // selected tasks to only the listed ones.
    fs.writeFileSync(path.join(tmpProject, "CLAUDE.md"), "# planted\n");

    startCapture();
    await runSetup({ only: ["settings-json"] });
    stopCapture();

    const state = JSON.parse(fs.readFileSync(path.join(tmpOutput, "state.json"), "utf-8"));
    // claude-md was reset to PENDING by reconciliation but NOT selected for
    // this run (--only settings-json). After the run it should still be PENDING.
    const claudeStatus = state.tasks["claude-md"]?.status;
    assert.ok(
      claudeStatus === "PENDING",
      `Expected claude-md to remain PENDING when excluded from --only, got ${claudeStatus}`,
    );
  });
});
