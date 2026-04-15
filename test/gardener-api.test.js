// Tests for the gardener registry + CLI dispatcher. The module captures
// ~/.claude-harness/projects.json at load time (via os.homedir()), so we
// override HOME *before* requiring it and pin the whole file to one tmp home.
const { describe, it, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

let tmpHome;
let registryPath;
let originalHome;
let gardenerApi;

// Capture console output so assertions can verify messages without polluting
// the test runner's output stream.
function captureConsole() {
  const logs = [];
  const errs = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => logs.push(args.join(" "));
  console.error = (...args) => errs.push(args.join(" "));
  return {
    logs,
    errs,
    restore: () => { console.log = origLog; console.error = origErr; },
  };
}

before(() => {
  originalHome = process.env.HOME;
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "harness-gardener-api-"));
  process.env.HOME = tmpHome;
  registryPath = path.join(tmpHome, ".claude-harness", "projects.json");

  // Ensure a fresh module load with the overridden HOME — some prior test may
  // have already loaded the module under the real HOME.
  const modulePath = require.resolve("../dist/gardener-api");
  delete require.cache[modulePath];
  gardenerApi = require("../dist/gardener-api");
});

beforeEach(() => {
  if (fs.existsSync(registryPath)) fs.unlinkSync(registryPath);
});

after(() => {
  if (originalHome !== undefined) process.env.HOME = originalHome;
  else delete process.env.HOME;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

const readRegistry = () => JSON.parse(fs.readFileSync(registryPath, "utf-8"));

describe("addProject", () => {
  it("creates the registry file on first add with default schedule", () => {
    const cap = captureConsole();
    try {
      gardenerApi.addProject("/some/project");
    } finally { cap.restore(); }

    const reg = readRegistry();
    assert.equal(reg.projects.length, 1);
    assert.equal(reg.projects[0].path, path.resolve("/some/project"));
    assert.equal(reg.projects[0].schedule, "0 9 * * 1-5");
    assert.equal(reg.projects[0].lastRunAt, null);
    assert.equal(reg.projects[0].lastWorktreeCommit, null);
    assert.ok(cap.logs.some((l) => l.includes("Registered gardener")));
  });

  it("accepts a custom schedule", () => {
    const cap = captureConsole();
    try {
      gardenerApi.addProject("/some/project", "0 9 * * 1");
    } finally { cap.restore(); }
    assert.equal(readRegistry().projects[0].schedule, "0 9 * * 1");
  });

  it("updates schedule when project is already registered (no duplicate)", () => {
    const cap = captureConsole();
    try {
      gardenerApi.addProject("/dup", "0 9 * * 1-5");
      gardenerApi.addProject("/dup", "*/15 * * * *");
    } finally { cap.restore(); }
    const reg = readRegistry();
    assert.equal(reg.projects.length, 1, "should not duplicate");
    assert.equal(reg.projects[0].schedule, "*/15 * * * *");
    assert.ok(cap.logs.some((l) => l.includes("Updated gardener")));
  });

  it("normalizes relative project paths to absolute", () => {
    const cap = captureConsole();
    try {
      gardenerApi.addProject("./rel-path");
    } finally { cap.restore(); }
    const p = readRegistry().projects[0].path;
    assert.ok(path.isAbsolute(p), `expected absolute, got ${p}`);
  });
});

describe("removeProject", () => {
  it("removes an existing project", () => {
    const cap = captureConsole();
    try {
      gardenerApi.addProject("/gone");
      gardenerApi.removeProject("/gone");
    } finally { cap.restore(); }
    assert.equal(readRegistry().projects.length, 0);
    assert.ok(cap.logs.some((l) => l.includes("Removed gardener")));
  });

  it("is a no-op for an unregistered project", () => {
    const cap = captureConsole();
    try {
      gardenerApi.removeProject("/never-registered");
    } finally { cap.restore(); }
    // No registry file written — nothing to clean up.
    assert.ok(cap.logs.some((l) => l.includes("No gardener found")));
  });

  it("preserves other projects when removing one", () => {
    const cap = captureConsole();
    try {
      gardenerApi.addProject("/a");
      gardenerApi.addProject("/b");
      gardenerApi.addProject("/c");
      gardenerApi.removeProject("/b");
    } finally { cap.restore(); }
    const paths = readRegistry().projects.map((p) => p.path);
    assert.deepEqual(paths.sort(), [path.resolve("/a"), path.resolve("/c")].sort());
  });
});

describe("getProject", () => {
  it("returns the project when registered", () => {
    const cap = captureConsole();
    try { gardenerApi.addProject("/found", "0 0 * * *"); } finally { cap.restore(); }
    const p = gardenerApi.getProject("/found");
    assert.ok(p);
    assert.equal(p.schedule, "0 0 * * *");
  });

  it("returns null for an unregistered project", () => {
    assert.equal(gardenerApi.getProject("/missing"), null);
  });

  it("returns null when the registry file does not exist", () => {
    assert.equal(gardenerApi.getProject("/anything"), null);
  });
});

describe("updateLastRun", () => {
  it("updates lastRunAt and lastWorktreeCommit", () => {
    const cap = captureConsole();
    try { gardenerApi.addProject("/tick"); } finally { cap.restore(); }

    gardenerApi.updateLastRun("/tick", "abc123def456");
    const p = gardenerApi.getProject("/tick");
    assert.equal(p.lastWorktreeCommit, "abc123def456");
    assert.ok(p.lastRunAt);
    // Parseable ISO-8601 timestamp.
    assert.ok(!Number.isNaN(Date.parse(p.lastRunAt)));
  });

  it("is a no-op for an unregistered project (does not create registry)", () => {
    gardenerApi.updateLastRun("/ghost", "deadbeef");
    assert.ok(!fs.existsSync(registryPath));
  });
});

describe("listProjects", () => {
  it("prints 'No gardener projects registered.' when empty", () => {
    const cap = captureConsole();
    try { gardenerApi.listProjects(); } finally { cap.restore(); }
    assert.ok(cap.logs.some((l) => l.includes("No gardener projects registered")));
  });

  it("prints project paths and schedules when populated", () => {
    const cap = captureConsole();
    try {
      gardenerApi.addProject("/apple", "0 9 * * 1");
      gardenerApi.addProject("/banana", "*/5 * * * *");
      cap.logs.length = 0;
      gardenerApi.listProjects();
    } finally { cap.restore(); }
    const out = cap.logs.join("\n");
    assert.ok(out.includes(path.resolve("/apple")));
    assert.ok(out.includes(path.resolve("/banana")));
    assert.ok(out.includes("0 9 * * 1"));
    assert.ok(out.includes("*/5 * * * *"));
    assert.ok(out.includes("never"), "unrun project should display 'never'");
  });
});

describe("registry resilience", () => {
  it("handles a corrupt projects.json by treating it as empty", () => {
    fs.mkdirSync(path.dirname(registryPath), { recursive: true });
    fs.writeFileSync(registryPath, "{ not valid json");

    // getProject should not throw; add should overwrite gracefully.
    assert.equal(gardenerApi.getProject("/anything"), null);

    const cap = captureConsole();
    try { gardenerApi.addProject("/rescue"); } finally { cap.restore(); }
    const reg = readRegistry();
    assert.equal(reg.projects.length, 1, "corrupt registry rebuilt with new entry");
    assert.equal(reg.projects[0].path, path.resolve("/rescue"));
  });

  it("persists registry atomically (no .tmp left behind)", () => {
    const cap = captureConsole();
    try { gardenerApi.addProject("/atomic"); } finally { cap.restore(); }
    const entries = fs.readdirSync(path.dirname(registryPath));
    assert.ok(entries.includes("projects.json"));
    assert.ok(!entries.some((e) => e.endsWith(".tmp")), "no stray .tmp file");
  });
});

describe("gardenerCommand dispatcher", () => {
  it("routes `add` to addProject and returns 0", async () => {
    const cap = captureConsole();
    let code;
    try {
      code = await gardenerApi.gardenerCommand(["add", "/routed"]);
    } finally { cap.restore(); }
    assert.equal(code, 0);
    assert.ok(gardenerApi.getProject("/routed"));
  });

  it("routes `add` with --schedule", async () => {
    const cap = captureConsole();
    try {
      await gardenerApi.gardenerCommand(["add", "/sched", "--schedule", "0 12 * * *"]);
    } finally { cap.restore(); }
    assert.equal(gardenerApi.getProject("/sched").schedule, "0 12 * * *");
  });

  it("`add` without project-dir returns exit code 1", async () => {
    const cap = captureConsole();
    let code;
    try { code = await gardenerApi.gardenerCommand(["add"]); } finally { cap.restore(); }
    assert.equal(code, 1);
    assert.ok(cap.errs.some((l) => l.includes("Usage")));
  });

  it("routes `remove` and returns 0", async () => {
    const cap = captureConsole();
    try {
      gardenerApi.addProject("/rm-me");
      cap.logs.length = 0;
    } finally { /* keep capturing below */ }
    let code;
    try {
      code = await gardenerApi.gardenerCommand(["remove", "/rm-me"]);
    } finally { cap.restore(); }
    assert.equal(code, 0);
    assert.equal(gardenerApi.getProject("/rm-me"), null);
  });

  it("`remove` without project-dir returns 1", async () => {
    const cap = captureConsole();
    let code;
    try { code = await gardenerApi.gardenerCommand(["remove"]); } finally { cap.restore(); }
    assert.equal(code, 1);
  });

  it("routes `list` and returns 0", async () => {
    const cap = captureConsole();
    let code;
    try { code = await gardenerApi.gardenerCommand(["list"]); } finally { cap.restore(); }
    assert.equal(code, 0);
  });

  it("`--help` returns 0 and prints usage", async () => {
    const cap = captureConsole();
    let code;
    try { code = await gardenerApi.gardenerCommand(["--help"]); } finally { cap.restore(); }
    assert.equal(code, 0);
    assert.ok(cap.logs.join("\n").includes("Subcommands"));
  });

  it("unknown subcommand returns 1", async () => {
    const cap = captureConsole();
    let code;
    try { code = await gardenerApi.gardenerCommand(["frobnicate"]); } finally { cap.restore(); }
    assert.equal(code, 1);
    assert.ok(cap.errs.some((l) => l.includes("Unknown gardener subcommand")));
  });

  it("empty args (no subcommand) returns 1", async () => {
    const cap = captureConsole();
    let code;
    try { code = await gardenerApi.gardenerCommand([]); } finally { cap.restore(); }
    assert.equal(code, 1);
  });
});
