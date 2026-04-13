// src/progress.ts — terminal progress display (TTY vs non-TTY)
import * as readline from "readline";
import { HarnessStats } from "./types";

export interface ProgressState {
  stats: HarnessStats;
  activeFiles: Map<string, { index: number; startedAt: number }>;
  elapsed: number;
  concurrency: number;
  targetDir: string;
}

const isTTY = process.stdout.isTTY ?? false;
let lastLineCount = 0;
let lastColumns = 0;

// After a terminal resize, old lines reflow — a line that fit in 100 cols
// wraps to 2 visual lines at 50 cols. This calculates how many visual lines
// the previous render now occupies so we clear the right amount.
function calcLinesToClear(): number {
  if (lastLineCount === 0) return 0;
  const cols = getColumns();
  if (lastColumns > 0 && lastColumns !== cols) {
    return lastLineCount * Math.ceil(lastColumns / cols);
  }
  return lastLineCount;
}

function getColumns(): number {
  return process.stdout.columns || 80;
}

function truncate(line: string, width: number): string {
  // Account for unicode chars like █ and ░ which may be multi-byte
  if (line.length <= width) return line;
  return line.slice(0, width);
}

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function renderProgressBar(done: number, total: number, width = 30): string {
  if (total === 0) return "░".repeat(width);
  const filled = Math.round((done / total) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function formatLogLine(
  event: "START" | "DONE" | "FAIL" | "TIMEOUT" | "SKIP",
  file: string,
  extra?: string,
): string {
  const time = new Date().toTimeString().slice(0, 8);
  const padded = event.padEnd(7);
  return extra
    ? `[${time}] ${padded} ${file} — ${extra}`
    : `[${time}] ${padded} ${file}`;
}

export function printLogLine(
  event: "START" | "DONE" | "FAIL" | "TIMEOUT" | "SKIP",
  file: string,
  extra?: string,
): void {
  console.log(formatLogLine(event, file, extra));
}

export function renderTTYProgress(state: ProgressState): string[] {
  const { stats, activeFiles, elapsed, concurrency } = state;
  const done = stats.completed + stats.failed + stats.timeout + stats.skipped;
  const pct = stats.totalTasks > 0 ? ((done / stats.totalTasks) * 100).toFixed(1) : "0.0";
  const cols = getColumns();

  const lines: string[] = [];
  lines.push(
    `  Progress: [${renderProgressBar(done, stats.totalTasks)}] ${done}/${stats.totalTasks} (${pct}%)`,
  );
  lines.push("");

  // Only show active workers — idle lines are misleading during single-task phases
  const workerMap = new Map<number, { file: string; startedAt: number }>();
  for (const [file, { index, startedAt }] of activeFiles) {
    workerMap.set(index, { file, startedAt });
  }

  const sortedWorkers = [...workerMap.entries()].sort(([a], [b]) => a - b);
  for (const [i, w] of sortedWorkers) {
    const dur = formatDuration(Date.now() - w.startedAt);
    const prefix = `  Worker ${i + 1}: `;
    const suffix = ` (${dur})`;
    const maxFileLen = cols - prefix.length - suffix.length - 2;
    const file = w.file.length > maxFileLen
      ? "..." + w.file.slice(-(maxFileLen - 3))
      : w.file;
    lines.push(`${prefix}${file}${suffix}`);
  }

  lines.push("");
  const remaining = stats.pending + stats.running;
  lines.push(
    `  Tasks: ${stats.completed} | Failed: ${stats.failed} | Timeout: ${stats.timeout} | Remaining: ${remaining}`,
  );
  lines.push(`  Results: ${state.targetDir}`);
  lines.push(`  Elapsed: ${formatDuration(elapsed)}`);

  // Truncate all lines to terminal width to prevent wrapping
  return lines.map((l) => truncate(l, cols));
}

export function printTTYProgress(state: ProgressState): void {
  if (!isTTY) return;

  // Erase previous block — resize-aware
  const toClear = calcLinesToClear();
  if (toClear > 0) {
    readline.moveCursor(process.stdout, 0, -toClear);
    readline.cursorTo(process.stdout, 0);
    readline.clearScreenDown(process.stdout);
  }

  const lines = renderTTYProgress(state);
  lastLineCount = lines.length;
  lastColumns = getColumns();

  for (const line of lines) {
    process.stdout.write(line + "\n");
  }
}

export function printEventAboveProgress(line: string): void {
  if (!isTTY) {
    console.log(line);
    return;
  }
  // Clear the progress block, print the event line, progress will re-render on next tick
  const toClear = calcLinesToClear();
  if (toClear > 0) {
    readline.moveCursor(process.stdout, 0, -toClear);
    readline.cursorTo(process.stdout, 0);
    readline.clearScreenDown(process.stdout);
  }
  console.log(line);
  lastLineCount = 0;
  lastColumns = 0;
}

export function clearProgress(): void {
  if (!isTTY || lastLineCount === 0) return;
  const toClear = calcLinesToClear();
  readline.moveCursor(process.stdout, 0, -toClear);
  readline.cursorTo(process.stdout, 0);
  readline.clearScreenDown(process.stdout);
  lastLineCount = 0;
  lastColumns = 0;
}

export { isTTY };
