const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  checkTargetDir,
  checkLockFile,
  createLockFile,
  removeLockFile,
} = require("../dist/preflight");

describe("checkTargetDir", () => {
  it("returns singleFile: null for a directory", () => {
    const result = checkTargetDir(os.tmpdir());
    assert.equal(result.singleFile, null);
  });

  it("returns singleFile for a file path", () => {
    const tmp = path.join(os.tmpdir(), `claude-harness-test-${Date.now()}.txt`);
    fs.writeFileSync(tmp, "test");
    try {
      const result = checkTargetDir(tmp);
      assert.equal(result.singleFile, tmp);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("throws for nonexistent path", () => {
    assert.throws(
      () => checkTargetDir("/tmp/nonexistent-" + Date.now()),
      /not found/i,
    );
  });
});

describe("lock file", () => {
  const lockDir = path.join(os.tmpdir(), `claude-harness-lock-test-${Date.now()}`);

  beforeEach(() => {
    fs.mkdirSync(lockDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(lockDir, { recursive: true, force: true });
  });

  it("creates and removes lock file", () => {
    createLockFile(lockDir);
    const lockPath = path.join(lockDir, "harness.lock");
    assert.ok(fs.existsSync(lockPath));

    const lock = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
    assert.equal(lock.pid, process.pid);
    assert.ok(lock.startedAt);
    assert.ok(lock.hostname);

    removeLockFile(lockDir);
    assert.ok(!fs.existsSync(lockPath));
  });

  it("removeLockFile is safe when no lock exists", () => {
    assert.doesNotThrow(() => removeLockFile(lockDir));
  });

  it("checkLockFile passes when no lock exists", () => {
    assert.doesNotThrow(() => checkLockFile(lockDir, false));
  });

  it("checkLockFile throws when lock is held by current process", () => {
    createLockFile(lockDir);
    assert.throws(
      () => checkLockFile(lockDir, false),
      /Another setup is running/,
    );
    removeLockFile(lockDir);
  });

  it("checkLockFile passes with --force even when locked", () => {
    createLockFile(lockDir);
    assert.doesNotThrow(() => checkLockFile(lockDir, true));
    removeLockFile(lockDir);
  });

  it("checkLockFile removes corrupt lock files", () => {
    const lockPath = path.join(lockDir, "harness.lock");
    fs.writeFileSync(lockPath, "not json{{{");
    assert.doesNotThrow(() => checkLockFile(lockDir, false));
    assert.ok(!fs.existsSync(lockPath));
  });

  it("checkLockFile detects stale lock from dead process", () => {
    const lockPath = path.join(lockDir, "harness.lock");
    fs.writeFileSync(
      lockPath,
      JSON.stringify({ pid: 999999999, startedAt: new Date().toISOString() }),
    );
    // Should warn but not throw (stale lock from dead process)
    assert.doesNotThrow(() => checkLockFile(lockDir, false));
  });
});
