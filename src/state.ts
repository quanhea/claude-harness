// src/state.ts — scan state persistence, atomic writes, resume logic
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  STATUS,
  STATE_VERSION,
  TaskStatus,
  TaskEntry,
  HarnessState,
  HarnessStats,
  HarnessConfig,
} from "./types";

export function initState(
  targetDir: string,
  taskIds: string[],
  config: HarnessConfig,
): HarnessState {
  const taskEntries: Record<string, TaskEntry> = {};
  for (const id of taskIds) {
    taskEntries[id] = { status: STATUS.PENDING, attempts: 0 };
  }
  return {
    version: STATE_VERSION,
    runId: crypto.randomBytes(4).toString("hex"),
    targetDir: path.resolve(targetDir),
    startedAt: new Date().toISOString(),
    config,
    stats: computeStats(taskEntries),
    tasks: taskEntries,
  };
}

export function computeStats(tasks: Record<string, TaskEntry>): HarnessStats {
  const stats: HarnessStats = {
    totalTasks: 0,
    completed: 0,
    failed: 0,
    timeout: 0,
    skipped: 0,
    pending: 0,
    running: 0,
  };
  for (const entry of Object.values(tasks)) {
    stats.totalTasks++;
    switch (entry.status) {
      case STATUS.COMPLETED:
        stats.completed++;
        break;
      case STATUS.FAILED:
        stats.failed++;
        break;
      case STATUS.TIMEOUT:
        stats.timeout++;
        break;
      case STATUS.SKIPPED:
        stats.skipped++;
        break;
      case STATUS.RUNNING:
        stats.running++;
        break;
      case STATUS.PENDING:
      case STATUS.INTERRUPTED:
        stats.pending++;
        break;
    }
  }
  return stats;
}

export function saveState(state: HarnessState, outputDir: string): void {
  state.stats = computeStats(state.tasks);
  const statePath = path.join(outputDir, "state.json");
  const tmpPath = statePath + ".tmp";
  const data = JSON.stringify(state, null, 2);

  const fd = fs.openSync(tmpPath, "w");
  fs.writeSync(fd, data);
  fs.fsyncSync(fd);
  fs.closeSync(fd);

  fs.renameSync(tmpPath, statePath);
}

export function loadState(outputDir: string): HarnessState | null {
  const statePath = path.join(outputDir, "state.json");
  if (!fs.existsSync(statePath)) return null;

  const raw = JSON.parse(fs.readFileSync(statePath, "utf-8"));
  if (raw.version > STATE_VERSION) {
    throw new Error(
      `State file is from a newer version (v${raw.version}). Update claude-harness.`,
    );
  }
  return raw as HarnessState;
}

export function resetStaleRunning(state: HarnessState): number {
  let count = 0;
  for (const entry of Object.values(state.tasks)) {
    if (
      entry.status === STATUS.RUNNING ||
      entry.status === STATUS.INTERRUPTED
    ) {
      entry.status = STATUS.PENDING;
      count++;
    }
  }
  state.stats = computeStats(state.tasks);
  return count;
}

export function resetFailed(state: HarnessState): number {
  let count = 0;
  for (const entry of Object.values(state.tasks)) {
    if (
      entry.status === STATUS.FAILED ||
      entry.status === STATUS.TIMEOUT ||
      entry.status === STATUS.SKIPPED
    ) {
      entry.status = STATUS.PENDING;
      entry.attempts = 0;
      count++;
    }
  }
  state.stats = computeStats(state.tasks);
  return count;
}

export function mergeNewTasks(state: HarnessState, taskIds: string[]): number {
  let count = 0;
  for (const id of taskIds) {
    if (!state.tasks[id]) {
      state.tasks[id] = { status: STATUS.PENDING, attempts: 0 };
      count++;
    }
  }
  state.stats = computeStats(state.tasks);
  return count;
}

export function pruneExcludedTasks(state: HarnessState, freshTaskIds: string[]): number {
  const freshSet = new Set(freshTaskIds);
  let count = 0;
  for (const [file, entry] of Object.entries(state.tasks)) {
    // Only remove files that haven't been scanned yet
    if (entry.status === STATUS.PENDING && !freshSet.has(file)) {
      delete state.tasks[file];
      count++;
    }
  }
  if (count > 0) state.stats = computeStats(state.tasks);
  return count;
}

export function updateTaskStatus(
  state: HarnessState,
  taskId: string,
  status: TaskStatus,
  extra: Partial<TaskEntry> = {},
): void {
  const entry = state.tasks[taskId];
  if (!entry) return;
  entry.status = status;
  Object.assign(entry, extra);
  state.stats = computeStats(state.tasks);
}

export function getPendingTasks(state: HarnessState): string[] {
  return Object.entries(state.tasks)
    .filter(([, e]) => e.status === STATUS.PENDING)
    .map(([f]) => f);
}

export function shouldRetry(
  state: HarnessState,
  taskId: string,
  maxRetries: number,
): boolean {
  const entry = state.tasks[taskId];
  if (!entry) return false;
  return entry.attempts < maxRetries;
}

export function markForRetry(
  state: HarnessState,
  taskId: string,
  maxRetries: number,
): void {
  const entry = state.tasks[taskId];
  if (!entry) return;
  if (entry.attempts < maxRetries) {
    entry.status = STATUS.PENDING;
  } else {
    entry.status = STATUS.SKIPPED;
  }
  state.stats = computeStats(state.tasks);
}
