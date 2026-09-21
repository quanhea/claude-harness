const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnTask, taskToSlug, parseResetTime, NON_INTERACTIVE_PREFIX } = require("../dist/worker");

describe("parseResetTime", () => {
  it("parses 'resets 2am (Asia/Saigon)'", () => {
    const ms = parseResetTime("You've hit your limit · resets 2am (Asia/Saigon)");
    assert.ok(ms !== undefined, "should parse");
    assert.ok(ms > 0, "should be positive");
    assert.ok(ms < 25 * 60 * 60 * 1000, "should be within 25 hours");
  });

  it("parses 'resets 11pm (America/Los_Angeles)'", () => {
    const ms = parseResetTime("Rate limited · resets 11pm (America/Los_Angeles)");
    assert.ok(ms !== undefined);
    assert.ok(ms > 0);
  });

  it("parses without am/pm", () => {
    const ms = parseResetTime("resets 14 (UTC)");
    assert.ok(ms !== undefined);
  });

  it("returns undefined for unparseable messages", () => {
    assert.equal(parseResetTime("just some error"), undefined);
    assert.equal(parseResetTime("rate limited"), undefined);
    assert.equal(parseResetTime(""), undefined);
  });
});

describe("taskToSlug", () => {
  it("replaces slashes with double underscores", () => {
    assert.equal(taskToSlug("some/nested/task"), "some__nested__task");
  });

  it("leaves flat task IDs unchanged", () => {
    assert.equal(taskToSlug("claude-md"), "claude-md");
  });
});

describe("spawnTask", () => {
  let tmpDir;
  let targetDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-harness-worker-test-"));
    targetDir = path.join(tmpDir, "project");
    fs.mkdirSync(targetDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("times out and kills a long-running process", async () => {
    const outputDir = path.join(tmpDir, "output");
    const { promise } = spawnTask({
      targetDir,
      outputDir,
      taskId: "claude-md",
      promptTemplate: "analyze {{PROJECT_DIR}} output to {{OUTPUT_DIR}} task {{TASK_ID}}",
      config: {
        parallel: 1,
        timeout: 1, // 1 second timeout
        maxRetries: 0,
        maxTurns: 5,
        model: null,
        verbose: false,
      },
    });

    const result = await promise;
    assert.ok(
      result.status === "TIMEOUT" || result.status === "FAILED",
      `Expected TIMEOUT or FAILED, got ${result.status}`,
    );
    assert.ok(result.taskId === "claude-md");
    assert.ok(result.durationMs >= 0);
  });

  it("creates output directories", async () => {
    const outputDir = path.join(tmpDir, "output");
    const { promise } = spawnTask({
      targetDir,
      outputDir,
      taskId: "settings-json",
      promptTemplate: "task {{TASK_ID}} in {{PROJECT_DIR}}",
      config: {
        parallel: 1,
        timeout: 2,
        maxRetries: 0,
        maxTurns: 5,
        model: null,
        verbose: false,
      },
    });

    await promise;
    // spawnTask creates logs/ (raw stdout) and debug/ (orchestrator events).
    // The old raw/ dir is gone.
    assert.ok(fs.existsSync(path.join(outputDir, "logs")), "logs/ directory should exist");
  });

  it("prepends NON_INTERACTIVE_PREFIX to the prompt (promptBytes reflects prefix)", async () => {
    const outputDir = path.join(tmpDir, "output");
    const userPrompt = "tiny prompt body";
    const { promise } = spawnTask({
      targetDir,
      outputDir,
      taskId: "claude-md",
      promptTemplate: userPrompt,
      config: {
        parallel: 1,
        timeout: 1,
        maxRetries: 0,
        maxTurns: 5,
        model: null,
        verbose: false,
      },
    });
    await promise;

    // worker.ts writes the rendered prompt as the log's first JSONL line —
    // stream-json never echoes the -p bootstrap prompt back, so this line is
    // the only record of what was actually sent.
    const logFile = path.join(outputDir, "logs", "claude-md.log");
    const firstLine = fs.readFileSync(logFile, "utf-8").split("\n")[0];
    const sent = JSON.parse(firstLine);
    assert.equal(sent.type, "prompt");
    assert.ok(
      sent.prompt.startsWith(NON_INTERACTIVE_PREFIX),
      "the rendered prompt should lead with NON_INTERACTIVE_PREFIX",
    );
    assert.ok(sent.prompt.endsWith(userPrompt), "the user prompt should follow the prefix");
  });

  it("NON_INTERACTIVE_PREFIX has the expected safety language", () => {
    assert.match(NON_INTERACTIVE_PREFIX, /NON-INTERACTIVE/);
    assert.match(NON_INTERACTIVE_PREFIX, /pre-approved/i);
    assert.match(NON_INTERACTIVE_PREFIX, /do not ask/i);
  });

  it("uses double-underscore slug for nested task ids in log paths", async () => {
    const outputDir = path.join(tmpDir, "output");
    const { promise } = spawnTask({
      targetDir,
      outputDir,
      taskId: "rule/architecture",
      promptTemplate: "t",
      config: {
        parallel: 1,
        timeout: 1,
        maxRetries: 0,
        maxTurns: 5,
        model: null,
        verbose: false,
      },
    });
    await promise;
    assert.ok(fs.existsSync(path.join(outputDir, "logs", "rule__architecture.log")));
  });

  it("kill() terminates the process", async () => {
    const outputDir = path.join(tmpDir, "output");
    const { promise, kill } = spawnTask({
      targetDir,
      outputDir,
      taskId: "architecture-md",
      promptTemplate: "task {{TASK_ID}}",
      config: {
        parallel: 1,
        timeout: 60,
        maxRetries: 0,
        maxTurns: 5,
        model: null,
        verbose: false,
      },
    });

    setTimeout(() => kill(), 100);
    const result = await promise;
    assert.ok(
      result.status === "TIMEOUT" || result.status === "FAILED",
      `Expected TIMEOUT or FAILED after kill, got ${result.status}`,
    );
  });
});
