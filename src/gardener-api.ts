// src/gardener-api.ts — manage ~/.claude-harness/projects.json registry
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { GardenerProject, GardenerRegistry } from "./types";

const REGISTRY_DIR = path.join(os.homedir(), ".claude-harness");
const REGISTRY_PATH = path.join(REGISTRY_DIR, "projects.json");
const DEFAULT_SCHEDULE = "0 9 * * 1-5"; // weekdays at 9am

function loadRegistry(): GardenerRegistry {
  if (!fs.existsSync(REGISTRY_PATH)) return { projects: [] };
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
  } catch {
    return { projects: [] };
  }
}

function saveRegistry(registry: GardenerRegistry): void {
  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  const tmp = REGISTRY_PATH + ".tmp";
  const data = JSON.stringify(registry, null, 2);
  const fd = fs.openSync(tmp, "w");
  fs.writeSync(fd, data);
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  fs.renameSync(tmp, REGISTRY_PATH);
}

export function addProject(projectPath: string, schedule = DEFAULT_SCHEDULE): void {
  const absPath = path.resolve(projectPath);
  const registry = loadRegistry();
  const existing = registry.projects.find((p) => p.path === absPath);
  if (existing) {
    existing.schedule = schedule;
    console.log(`Updated gardener for ${absPath} (schedule: ${schedule})`);
  } else {
    const project: GardenerProject = {
      path: absPath,
      schedule,
      lastRunAt: null,
      lastWorktreeCommit: null,
    };
    registry.projects.push(project);
    console.log(`Registered gardener for ${absPath} (schedule: ${schedule})`);
  }
  saveRegistry(registry);
}

export function removeProject(projectPath: string): void {
  const absPath = path.resolve(projectPath);
  const registry = loadRegistry();
  const before = registry.projects.length;
  registry.projects = registry.projects.filter((p) => p.path !== absPath);
  if (registry.projects.length < before) {
    saveRegistry(registry);
    console.log(`Removed gardener for ${absPath}`);
  } else {
    console.log(`No gardener found for ${absPath}`);
  }
}

export function listProjects(): void {
  const registry = loadRegistry();
  if (registry.projects.length === 0) {
    console.log("No gardener projects registered.");
    return;
  }
  console.log(`Registered gardener projects (${registry.projects.length}):`);
  for (const p of registry.projects) {
    const last = p.lastRunAt ? new Date(p.lastRunAt).toLocaleDateString() : "never";
    console.log(`  ${p.path}`);
    console.log(`    schedule: ${p.schedule}  last run: ${last}`);
  }
}

export function getProject(projectPath: string): GardenerProject | null {
  const absPath = path.resolve(projectPath);
  const registry = loadRegistry();
  return registry.projects.find((p) => p.path === absPath) ?? null;
}

export function updateLastRun(projectPath: string, worktreeCommit: string): void {
  const absPath = path.resolve(projectPath);
  const registry = loadRegistry();
  const project = registry.projects.find((p) => p.path === absPath);
  if (project) {
    project.lastRunAt = new Date().toISOString();
    project.lastWorktreeCommit = worktreeCommit;
    saveRegistry(registry);
  }
}

export async function gardenerCommand(args: string[]): Promise<number> {
  const subcommand = args[0];

  switch (subcommand) {
    case "add": {
      const projectDir = args[1];
      if (!projectDir) { console.error("Usage: claude-harness gardener add <project-dir> [--schedule <cron>]"); return 1; }
      const scheduleIdx = args.indexOf("--schedule");
      const schedule = scheduleIdx !== -1 && args[scheduleIdx + 1] ? args[scheduleIdx + 1] : DEFAULT_SCHEDULE;
      addProject(projectDir, schedule);
      return 0;
    }

    case "remove": {
      const projectDir = args[1];
      if (!projectDir) { console.error("Usage: claude-harness gardener remove <project-dir>"); return 1; }
      removeProject(projectDir);
      return 0;
    }

    case "list": {
      listProjects();
      return 0;
    }

    case "run": {
      const projectDir = args[1];
      if (!projectDir) { console.error("Usage: claude-harness gardener run <project-dir>"); return 1; }
      const { runGardener } = await import("./gardener");
      return runGardener(projectDir);
    }

    case "--help":
    case "-h": {
      console.log(`claude-harness gardener — manage doc-gardening schedules

Subcommands:
  add <project-dir> [--schedule <cron>]   Register a project (default: weekdays at 9am)
  remove <project-dir>                    Unregister a project
  list                                    List all registered projects
  run <project-dir>                       Run the gardener immediately`);
      return 0;
    }

    default: {
      console.error(`Unknown gardener subcommand: ${subcommand ?? "(none)"}`);
      console.error("Valid subcommands: add, remove, list, run");
      return 1;
    }
  }
}
