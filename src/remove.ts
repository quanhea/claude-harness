// src/remove.ts — selectively remove generated features
import * as fs from "fs";
import * as path from "path";
import { checkbox } from "@inquirer/prompts";
import { buildGroupedChoices } from "./ui";
import { TASK_MANIFEST, STATUS } from "./types";
import { loadPrompt } from "./prompt";
import { loadState, saveState, computeStats } from "./state";
import { getProjectDir } from "./paths";
import { outputExists, globToRegex, staticPrefix, migrateOldStateDir } from "./scanner";

function walkDelete(rootDir: string, relPath: string, regex: RegExp, depth: number): string[] {
  if (depth > 10) return [];
  const absPath = relPath ? path.join(rootDir, relPath) : rootDir;
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(absPath, { withFileTypes: true }); } catch { return []; }
  const deleted: string[] = [];
  for (const entry of entries) {
    const childRel = relPath ? `${relPath}/${entry.name}` : entry.name;
    if (regex.test(childRel)) {
      const full = path.join(rootDir, childRel);
      try { fs.rmSync(full, { recursive: true, force: true }); deleted.push(childRel); } catch {}
    } else if (entry.isDirectory()) {
      deleted.push(...walkDelete(rootDir, childRel, regex, depth + 1));
    }
  }
  return deleted;
}

function deleteOutput(targetDir: string, pattern: string): string[] {
  if (!/[*?{]/.test(pattern)) {
    const full = path.join(targetDir, pattern);
    if (fs.existsSync(full)) {
      fs.rmSync(full, { recursive: true, force: true });
      return [pattern];
    }
    return [];
  }
  const regex = globToRegex(pattern);
  const startRel = staticPrefix(pattern);
  const startAbs = path.join(targetDir, startRel);
  if (!fs.existsSync(startAbs)) return [];
  return walkDelete(targetDir, startRel, regex, 0);
}

export async function removeCommand(args: string[]): Promise<number> {
  const dryRun = args.includes("--dry-run");
  const positional = args.filter((a) => !a.startsWith("--"));
  const targetDir = positional[0] ? path.resolve(positional[0]) : process.cwd();
  const outputDir = getProjectDir(targetDir);

  const meta = new Map<string, ReturnType<typeof loadPrompt>>();
  for (const task of TASK_MANIFEST) {
    try { meta.set(task.id, loadPrompt(task.promptFile)); } catch {}
  }

  migrateOldStateDir(targetDir, outputDir);

  // Filesystem is the source of truth — show tasks whose output files
  // actually exist on disk, regardless of what state.json says.
  const presentOnDisk = TASK_MANIFEST
    .filter((t) => {
      const outputs = meta.get(t.id)?.meta.outputs;
      if (!outputs || outputs.length === 0) return false;
      return outputs.some((p) => outputExists(targetDir, p));
    })
    .map((t) => {
      const outputs = meta.get(t.id)!.meta.outputs!;
      const desc = meta.get(t.id)?.meta.description ?? t.id;
      return {
        name: `[${t.id}] ${desc} → ${outputs.join(", ")}`,
        value: t.id,
        checked: false,
      };
    });

  if (presentOnDisk.length === 0) {
    console.log("No generated files found on disk. Nothing to remove.");
    return 0;
  }

  if (dryRun) {
    console.log("Would show these features for removal:");
    for (const c of presentOnDisk) console.log(`  ${c.name}`);
    return 0;
  }

  if (!process.stdout.isTTY) {
    console.error("Remove requires an interactive terminal.");
    return 1;
  }

  const selected = await checkbox({
    message: `Select features to remove (${presentOnDisk.length} on disk):`,
    choices: buildGroupedChoices(presentOnDisk),
    pageSize: Math.min(presentOnDisk.length + 6, 50),
  });

  if (selected.length === 0) {
    console.log("Nothing selected.");
    return 0;
  }

  // Update state if it exists (optional — filesystem is the authority)
  const state = loadState(outputDir);

  let totalDeleted = 0;
  for (const taskId of selected) {
    const outputs = meta.get(taskId)?.meta.outputs ?? [];
    const deleted: string[] = [];
    for (const output of outputs) {
      deleted.push(...deleteOutput(targetDir, output));
    }
    if (state?.tasks[taskId]) {
      state.tasks[taskId] = {
        ...state.tasks[taskId],
        status: STATUS.PENDING as any,
        attempts: 0,
      };
      delete (state.tasks[taskId] as any).completedAt;
      delete (state.tasks[taskId] as any).durationMs;
      delete (state.tasks[taskId] as any).exitCode;
    }
    totalDeleted += deleted.length;
    if (deleted.length > 0) {
      console.log(`  [${taskId}] deleted: ${deleted.join(", ")}`);
    } else {
      console.log(`  [${taskId}] files already absent`);
    }
  }

  if (state) {
    state.stats = computeStats(state.tasks);
    saveState(state, outputDir);
  }
  console.log(`\nRemoved ${selected.length} feature(s), ${totalDeleted} file(s). Re-run claude-harness to regenerate.`);
  return 0;
}
