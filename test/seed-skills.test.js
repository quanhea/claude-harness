const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { installSeedSkills, seedSkillNames } = require("../dist/seed-skills");

let tmp;
before(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), "harness-seed-test-")); });
after(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

describe("seedSkillNames", () => {
  it("lists the bundled skills", () => {
    const names = seedSkillNames();
    assert.ok(names.length > 0, "the package should bundle at least one seed skill");
    assert.ok(names.includes("resolve-conflict"));
  });

  it("every bundled seed has a SKILL.md with a name and description", () => {
    for (const name of seedSkillNames()) {
      const file = path.join(__dirname, "..", "skills", name, "SKILL.md");
      assert.ok(fs.existsSync(file), `${name} should have a SKILL.md`);
      const body = fs.readFileSync(file, "utf-8");
      assert.match(body, /^---\r?\n/, `${name} SKILL.md should open with frontmatter`);
      assert.match(body, /\nname:\s*\S/, `${name} should declare a name`);
      assert.match(body, /\ndescription:\s*\S/, `${name} should declare a description`);
    }
  });

  it("the declared name matches the directory name", () => {
    for (const name of seedSkillNames()) {
      const body = fs.readFileSync(
        path.join(__dirname, "..", "skills", name, "SKILL.md"), "utf-8");
      assert.match(body, new RegExp(`\\nname:\\s*${name}\\s*\\n`),
        `${name}'s frontmatter name should match its directory`);
    }
  });
});

describe("installSeedSkills", () => {
  it("copies every seed into .claude/skills/ on a clean target", () => {
    const target = path.join(tmp, "clean");
    fs.mkdirSync(target);
    const res = installSeedSkills(target);
    assert.deepEqual(res.installed, seedSkillNames());
    assert.deepEqual(res.skipped, []);
    for (const name of seedSkillNames()) {
      assert.ok(fs.existsSync(path.join(target, ".claude", "skills", name, "SKILL.md")));
    }
  });

  it("copies a seed's companion files, not just SKILL.md", () => {
    const target = path.join(tmp, "companions");
    fs.mkdirSync(target);
    installSeedSkills(target);
    const srcCount = (n) => fs.readdirSync(path.join(__dirname, "..", "skills", n)).length;
    for (const name of seedSkillNames()) {
      const destCount = fs.readdirSync(path.join(target, ".claude", "skills", name)).length;
      assert.equal(destCount, srcCount(name), `${name} should copy all its files`);
    }
  });

  it("never overwrites a skill the project already has", () => {
    const target = path.join(tmp, "existing");
    const mine = path.join(target, ".claude", "skills", "resolve-conflict");
    fs.mkdirSync(mine, { recursive: true });
    fs.writeFileSync(path.join(mine, "SKILL.md"), "# mine, hands off\n");

    const res = installSeedSkills(target);
    assert.ok(res.skipped.includes("resolve-conflict"));
    assert.ok(!res.installed.includes("resolve-conflict"));
    assert.equal(
      fs.readFileSync(path.join(mine, "SKILL.md"), "utf-8"),
      "# mine, hands off\n",
      "an edited seed stays edited across runs",
    );
  });

  it("is idempotent — a second run installs nothing new", () => {
    const target = path.join(tmp, "twice");
    fs.mkdirSync(target);
    installSeedSkills(target);
    const second = installSeedSkills(target);
    assert.deepEqual(second.installed, []);
    assert.deepEqual(second.skipped, seedSkillNames());
  });
});
