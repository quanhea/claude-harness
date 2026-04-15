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

  it("writes a debug JSONL file with spawn and exit events", async () => {
    const outputDir = path.join(tmpDir, "output");
    const { promise } = spawnTask({
      targetDir,
      outputDir,
      taskId: "architecture-md",
      promptTemplate: "task {{TASK_ID}}",
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

    const debugFile = path.join(outputDir, "debug", "architecture-md.jsonl");
    assert.ok(fs.existsSync(debugFile), "debug/<slug>.jsonl should exist");

    const lines = fs.readFileSync(debugFile, "utf-8").trim().split("\n").filter(Boolean);
    assert.ok(lines.length >= 1, "should have at least one event");

    const events = lines.map((l) => JSON.parse(l));
    // Every event is timestamped + tagged.
    for (const e of events) {
      assert.ok(e.t, "every event has a timestamp");
      assert.ok(e.event, "every event is tagged");
    }
    // Either spawn-then-exit (claude found) OR spawn_error (claude missing).
    const tags = events.map((e) => e.event);
    assert.ok(
      tags.includes("spawn") || tags.includes("spawn_error"),
      `expected spawn or spawn_error, got ${tags.join(",")}`,
    );
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

    const debugFile = path.join(outputDir, "debug", "claude-md.jsonl");
    const events = fs.readFileSync(debugFile, "utf-8")
      .trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const spawnEvt = events.find((e) => e.event === "spawn" || e.event === "spawn_error");
    assert.ok(spawnEvt, "should have a spawn/spawn_error event");
    if (spawnEvt.event === "spawn") {
      // promptBytes should be at least the prefix length + user prompt length.
      assert.ok(
        spawnEvt.promptBytes >= NON_INTERACTIVE_PREFIX.length + userPrompt.length,
        `promptBytes=${spawnEvt.promptBytes} should include the prefix (${NON_INTERACTIVE_PREFIX.length})`,
      );
    }
  });

  it("NON_INTERACTIVE_PREFIX has the expected safety language", () => {
    assert.match(NON_INTERACTIVE_PREFIX, /NON-INTERACTIVE/);
    assert.match(NON_INTERACTIVE_PREFIX, /pre-approved/i);
    assert.match(NON_INTERACTIVE_PREFIX, /do not ask/i);
  });

  it("uses double-underscore slug for nested task ids in debug and log paths", async () => {
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
    assert.ok(fs.existsSync(path.join(outputDir, "debug", "rule__architecture.jsonl")));
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
