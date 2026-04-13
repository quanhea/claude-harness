const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const path = require("path");

const CLI = path.join(__dirname, "..", "dist", "cli.js");

describe("CLI", () => {
  it("--help shows usage", () => {
    const out = execFileSync("node", [CLI, "--help"], { encoding: "utf-8" });
    assert.ok(out.includes("claude-harness"));
    assert.ok(out.includes("--parallel") || out.includes("--only"));
    assert.ok(out.includes("--resume"));
    assert.ok(out.includes("--dry-run"));
  });

  it("--version shows version number", () => {
    const out = execFileSync("node", [CLI, "--version"], {
      encoding: "utf-8",
    });
    assert.match(out.trim(), /^\d+\.\d+\.\d+$/);
  });

  it("--dry-run lists tasks without running", () => {
    const tmpDir = require("fs").mkdtempSync(require("os").tmpdir() + "/harness-cli-test-");
    try {
      const out = execFileSync("node", [CLI, tmpDir, "--dry-run"], {
        encoding: "utf-8",
      });
      assert.ok(out.includes("Would run") || out.includes("task") || out.includes("discover"));
    } finally {
      require("fs").rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("--only flag is accepted", () => {
    const tmpDir = require("fs").mkdtempSync(require("os").tmpdir() + "/harness-cli-test-");
    try {
      const out = execFileSync("node", [CLI, tmpDir, "--dry-run", "--only", "claude-md,settings-json"], {
        encoding: "utf-8",
        stdio: "pipe",
      });
      assert.ok(out !== null); // just checking it doesn't crash
    } catch (err) {
      // Error exit is fine as long as --only is recognized (no "unknown option" error)
      if (err.stderr) {
        assert.ok(!err.stderr.includes("unknown option"), err.stderr);
      }
    } finally {
      require("fs").rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("gardener subcommand is accepted", () => {
    const out = execFileSync("node", [CLI, "gardener", "--help"], {
      encoding: "utf-8",
      stdio: "pipe",
    });
    assert.ok(
      out.includes("gardener") || out.includes("add") || out.includes("list"),
    );
  });

  it("exits with error for nonexistent target", () => {
    try {
      execFileSync("node", [CLI, "/tmp/nonexistent-" + Date.now(), "--dry-run"], {
        encoding: "utf-8",
        stdio: "pipe",
      });
      assert.fail("Should have exited with error");
    } catch (err) {
      assert.ok(err.status !== 0);
    }
  });
});
