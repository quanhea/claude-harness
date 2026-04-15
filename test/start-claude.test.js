// Tests for the start-claude command.
// We cannot actually launch an interactive claude session in CI, so we test:
//  1. Prompt loading and rendering (buildTaskTable + renderPrompt)
//  2. Project-local override: .claude/start-claude.md preferred over bundled
//  3. Missing target dir returns exit code 1
//  4. ENOENT (claude not found) is handled gracefully
//  5. Passthrough args are forwarded correctly
//
// The spawn itself is validated via a mock binary that echoes its argv to
// stdout and exits 0 — the same mock-claude pattern used by integration.test.js.

const { describe, it, before, beforeEach, afterEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const CLI = path.resolve(__dirname, "../dist/cli.js");
const MOCK_DIR = path.resolve(__dirname, "fixtures/mock-claude");

// A minimal mock binary that prints its argv as JSON then exits 0.
// Used to verify which flags start-claude passes to the real claude binary.
const MOCK_BIN_DIR = path.join(os.tmpdir(), "harness-start-claude-mock");
const MOCK_BIN = path.join(MOCK_BIN_DIR, "claude");

before(() => {
  fs.mkdirSync(MOCK_BIN_DIR, { recursive: true });
  // Node script: emit argv (everything passed by spawn) as JSON to stdout.
  // process.argv[0] = node, process.argv[1] = this script path,
  // process.argv[2..] = the args from spawn("claude", [...args]).
  fs.writeFileSync(
    MOCK_BIN,
    `#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify(process.argv.slice(2)) + '\\n');\n`,
  );
  fs.chmodSync(MOCK_BIN, 0o755);
});

after(() => {
  fs.rmSync(MOCK_BIN_DIR, { recursive: true, force: true });
});

let tmpProject;

beforeEach(() => {
  tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "harness-start-claude-proj-"));
  // Make it a valid-enough target (preflight won't run for start-claude, but useful anyway).
  fs.mkdirSync(path.join(tmpProject, ".git"));
  fs.writeFileSync(path.join(tmpProject, ".git", "HEAD"), "ref: refs/heads/main\n");
});

afterEach(() => {
  fs.rmSync(tmpProject, { recursive: true, force: true });
});

const env = (extra = {}) => ({
  ...process.env,
  PATH: MOCK_BIN_DIR + ":" + process.env.PATH,
  ...extra,
});

// Run start-claude synchronously via the mock binary and capture stdout.
function run(args = [], extraEnv = {}) {
  return spawnSync("node", [CLI, "start-claude", ...args], {
    encoding: "utf-8",
    env: env(extraEnv),
    timeout: 15000,
  });
}

describe("start-claude prompt rendering", () => {
  it("passes --append-system-prompt to the claude binary", () => {
    const result = run([tmpProject]);
    // Mock binary echoes argv as JSON.
    const argv = JSON.parse(result.stdout.trim());
    assert.equal(argv[0], "--append-system-prompt", "first arg must be --append-system-prompt");
    assert.ok(argv[1].includes("claude-harness"), "system prompt should mention claude-harness");
  });

  it("renders {{PROJECT_DIR}} into the system prompt", () => {
    const result = run([tmpProject]);
    const argv = JSON.parse(result.stdout.trim());
    const systemPrompt = argv[1];
    assert.ok(systemPrompt.includes(tmpProject), "system prompt should contain the resolved project dir");
  });

  it("renders {{TASK_COUNT}} — should equal the manifest size", () => {
    const { TASK_MANIFEST } = require("../dist/types");
    const result = run([tmpProject]);
    const argv = JSON.parse(result.stdout.trim());
    const systemPrompt = argv[1];
    assert.ok(
      systemPrompt.includes(String(TASK_MANIFEST.length)),
      `system prompt should mention ${TASK_MANIFEST.length} tasks`,
    );
  });

  it("includes a task table row for every task in the manifest", () => {
    const { TASK_MANIFEST } = require("../dist/types");
    const result = run([tmpProject]);
    const argv = JSON.parse(result.stdout.trim());
    const systemPrompt = argv[1];
    // Spot-check a few task IDs are present in the rendered table.
    for (const t of ["claude-md", "architecture-md", "skills", "mcp-config"]) {
      assert.ok(systemPrompt.includes(t), `task '${t}' should appear in the task table`);
    }
    // Every task ID should appear.
    const missing = TASK_MANIFEST.filter((t) => !systemPrompt.includes(t.id));
    assert.equal(missing.length, 0, `Missing tasks: ${missing.map((t) => t.id).join(", ")}`);
  });

  it("marks always-run tasks in the task table", () => {
    const result = run([tmpProject]);
    const argv = JSON.parse(result.stdout.trim());
    assert.ok(argv[1].includes("always-run"), "table should flag always-run tasks");
  });
});

describe("project-local override", () => {
  it("uses bundled prompt when no .claude/start-claude.md exists", () => {
    const result = run([tmpProject]);
    assert.equal(result.status, 0);
    // Console output (stderr for the harness) should say bundled
    assert.ok(result.stderr.includes("bundled"), `expected 'bundled' in stderr, got: ${result.stderr}`);
  });

  it("prefers .claude/start-claude.md when it exists in the project", () => {
    const overrideDir = path.join(tmpProject, ".claude");
    fs.mkdirSync(overrideDir, { recursive: true });
    fs.writeFileSync(
      path.join(overrideDir, "start-claude.md"),
      "# Custom harness context for this project\n\nHello from the override.\n",
    );

    const result = run([tmpProject]);
    assert.equal(result.status, 0);
    const argv = JSON.parse(result.stdout.trim());
    assert.ok(argv[1].includes("Custom harness context"), "should use override content");
    assert.ok(result.stderr.includes("project-local"), `expected 'project-local' in stderr, got: ${result.stderr}`);
  });
});

describe("passthrough args", () => {
  it("forwards args after -- to the claude binary", () => {
    const result = run([tmpProject, "--", "--model", "claude-opus-4-6", "--verbose"]);
    const argv = JSON.parse(result.stdout.trim());
    assert.ok(argv.includes("--model"), "should forward --model");
    assert.ok(argv.includes("claude-opus-4-6"), "should forward model value");
    assert.ok(argv.includes("--verbose"), "should forward --verbose");
  });

  it("passthrough args appear after --append-system-prompt <content>", () => {
    const result = run([tmpProject, "--", "--model", "claude-sonnet-4-6"]);
    const argv = JSON.parse(result.stdout.trim());
    assert.equal(argv[0], "--append-system-prompt");
    const modelIdx = argv.indexOf("--model");
    assert.ok(modelIdx > 1, "--model should come after the system prompt arg");
  });
});

describe("error handling", () => {
  it("returns exit code 1 for a non-existent target directory", () => {
    const result = run(["/absolutely/does/not/exist/anywhere"]);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes("not found") || result.stderr.includes("Error"));
  });

  it("defaults to cwd when no target-dir is given", () => {
    // Run without a target dir — should not error (cwd exists).
    const result = spawnSync("node", [CLI, "start-claude"], {
      encoding: "utf-8",
      env: env(),
      cwd: tmpProject,
      timeout: 15000,
    });
    assert.equal(result.status, 0);
    const argv = JSON.parse(result.stdout.trim());
    assert.equal(argv[0], "--append-system-prompt");
    // cwd (tmpProject) should appear in the system prompt
    assert.ok(argv[1].includes(tmpProject), "should use cwd as project dir");
  });
});
