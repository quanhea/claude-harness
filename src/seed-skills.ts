// src/seed-skills.ts — install the bundled process skills into a target project.
//
// These are the skills that are worth having in any repo regardless of what
// its conversation history happens to contain: resolving a merge, authoring a
// PR, writing another skill. The `skills` task mines history for the
// project-specific ones; these are the floor it starts from.
//
// Copied deterministically rather than generated, because the content is
// fixed — asking a model to transcribe a known file is a way to get a
// slightly different file.

import * as fs from "fs";
import * as path from "path";

const SEEDS_DIR = path.join(__dirname, "..", "skills");

export interface SeedResult {
  installed: string[];
  skipped: string[];   // already present in the target — never overwritten
}

// Copy each bundled skill into <targetDir>/.claude/skills/<name>/, leaving any
// skill the project already has completely alone. A project that has edited
// its copy of a seed owns it from then on; re-running the harness must not
// revert that.
export function installSeedSkills(targetDir: string): SeedResult {
  const result: SeedResult = { installed: [], skipped: [] };
  if (!fs.existsSync(SEEDS_DIR)) return result;

  const destRoot = path.join(targetDir, ".claude", "skills");

  for (const name of fs.readdirSync(SEEDS_DIR).sort()) {
    const src = path.join(SEEDS_DIR, name);
    if (!fs.statSync(src).isDirectory()) continue;

    const dest = path.join(destRoot, name);
    if (fs.existsSync(dest)) {
      result.skipped.push(name);
      continue;
    }

    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
    result.installed.push(name);
  }

  return result;
}

// The names of the bundled seeds, for prompts and reporting.
export function seedSkillNames(): string[] {
  if (!fs.existsSync(SEEDS_DIR)) return [];
  return fs
    .readdirSync(SEEDS_DIR)
    .filter((n) => fs.statSync(path.join(SEEDS_DIR, n)).isDirectory())
    .sort();
}
