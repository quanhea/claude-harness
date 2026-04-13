const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  formatDuration,
  renderProgressBar,
  formatLogLine,
  renderTTYProgress,
} = require("../dist/progress");

describe("formatDuration", () => {
  it("formats seconds", () => {
    assert.equal(formatDuration(5000), "0m 05s");
    assert.equal(formatDuration(65000), "1m 05s");
    assert.equal(formatDuration(3661000), "61m 01s");
  });

  it("handles zero", () => {
    assert.equal(formatDuration(0), "0m 00s");
  });
});

describe("renderProgressBar", () => {
  it("renders empty bar for 0 progress", () => {
    const bar = renderProgressBar(0, 100, 10);
    assert.equal(bar, "░░░░░░░░░░");
  });

  it("renders full bar for complete", () => {
    const bar = renderProgressBar(100, 100, 10);
    assert.equal(bar, "██████████");
  });

  it("renders partial bar", () => {
    const bar = renderProgressBar(50, 100, 10);
    assert.equal(bar, "█████░░░░░");
  });

  it("handles zero total", () => {
    const bar = renderProgressBar(0, 0, 10);
    assert.equal(bar, "░░░░░░░░░░");
  });
});

describe("formatLogLine", () => {
  it("formats START event", () => {
    const line = formatLogLine("START", "claude-md");
    assert.match(line, /\[\d{2}:\d{2}:\d{2}\] START\s+claude-md/);
  });

  it("formats DONE event with extra", () => {
    const line = formatLogLine("DONE", "settings-json", "completed (45s)");
    assert.match(line, /DONE\s+settings-json — completed/);
  });

  it("pads event names to 7 chars", () => {
    const start = formatLogLine("START", "f");
    const done = formatLogLine("DONE", "f");
    const startIdx = start.indexOf("START");
    const doneIdx = done.indexOf("DONE");
    assert.equal(startIdx, doneIdx);
  });
});

describe("renderTTYProgress", () => {
  it("renders progress state", () => {
    const state = {
      stats: {
        totalTasks: 29,
        completed: 10,
        failed: 1,
        timeout: 0,
        skipped: 0,
        pending: 16,
        running: 2,
      },
      activeFiles: new Map([
        ["settings-json", { index: 0, startedAt: Date.now() - 60000 }],
        ["architecture-md", { index: 1, startedAt: Date.now() - 30000 }],
      ]),
      elapsed: 300000,
      concurrency: 4,
      targetDir: "/tmp/my-project",
    };

    const lines = renderTTYProgress(state);
    const output = lines.join("\n");
    assert.ok(output.includes("11/29"));
    assert.ok(output.includes("Worker 1"));
    assert.ok(output.includes("settings-json"));
    assert.ok(output.includes("Worker 2"));
    assert.ok(output.includes("architecture-md"));
    assert.ok(output.includes("/tmp/my-project"));
  });

  it("shows only active workers, not idle ones", () => {
    const state = {
      stats: {
        totalTasks: 10,
        completed: 0,
        failed: 0,
        timeout: 0,
        skipped: 0,
        pending: 9,
        running: 1,
      },
      activeFiles: new Map([
        ["claude-md", { index: 0, startedAt: Date.now() }],
      ]),
      elapsed: 0,
      concurrency: 6,
      targetDir: "/tmp/my-project",
    };

    const lines = renderTTYProgress(state);
    const output = lines.join("\n");
    assert.ok(output.includes("Worker 1:"));
    assert.ok(output.includes("claude-md"));
    assert.ok(!output.includes("idle"), "should not show idle worker lines");
    assert.ok(!output.includes("Worker 2:"), "should not show unused workers");
  });
});
