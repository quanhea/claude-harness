// src/scanner.ts — top-level orchestrator (flat parallel task runner)
import * as path from "path";
import * as readline from "readline";
import { HarnessOptions, STATUS, TASK_MANIFEST, TaskDefinition } from "./types";
import { runPreflight, removeLockFile } from "./preflight";
import { loadPrompt, renderPrompt, buildPromptVars } from "./prompt";
import {
  initState,
  loadState,
  saveState,
  resetStaleRunning,
  resetFailed,
  updateTaskStatus,
  computeStats,
} from "./state";
import { WorkerPool } from "./worker-pool";
import { writeReport } from "./reporter";
import {
  isTTY,
  printEventAboveProgress,
  clearProgress,
  formatDuration,
  formatLogLine,
  printTTYProgress,
} from "./progress";

function selectTasks(only: string[] | null): TaskDefinition[] {
  if (!only || only.length === 0) return TASK_MANIFEST;
  const set = new Set(only);
  return TASK_MANIFEST.filter((t) => set.has(t.id));
}

export async function setup(options: HarnessOptions): Promise<number> {
  const {
    targetDir, outputDir, parallel, timeout, maxRetries, maxTurns, model,
    only, retry, dryRun, force, verbose,
  } = options;
  let resume = options.resume;

  const absTarget = path.resolve(targetDir);
  const absOutput = path.resolve(outputDir);

  runPreflight(absTarget, absOutput, { force });

  const config = { parallel, timeout, maxRetries, maxTurns, model, verbose };
  const selectedTasks = selectTasks(only);

  // Dry run — list and exit
  if (dryRun) {
    removeLockFile(absOutput);
    console.log(`Would run ${selectedTasks.length} tasks in parallel:`);
    for (const t of selectedTasks) console.log(`  [${t.id}] ${t.description}`);
    return 0;
  }

  // Prompt to resume if a previous run exists and is incomplete
  if (!resume && process.stdin.isTTY) {
    const existing = loadState(absOutput);
    if (existing) {
      const done = existing.stats.completed;
      const total = existing.stats.totalTasks;
      if (total - done > 0) {
        console.log(`Previous run found: ${done}/${total} tasks completed.`);
        const answer = await askYesNo("Resume previous run?");
        if (answer) resume = true;
      }
    }
  }

  let state;
  if (resume) {
    state = loadState(absOutput);
    if (!state) {
      removeLockFile(absOutput);
      throw new Error("No previous run found. Run without --resume first.");
    }
    const resetCount = resetStaleRunning(state);
    if (resetCount > 0) console.log(`Resumed: reset ${resetCount} interrupted tasks to pending.`);
    if (retry) {
      const retryCount = resetFailed(state);
      if (retryCount > 0) console.log(`Retry: reset ${retryCount} failed/timed-out tasks to pending.`);
    }
    state.config = config;
  } else {
    state = initState(absTarget, selectedTasks.map((t) => t.id), config);
  }

  const pendingTasks = selectedTasks.filter(
    (t) => state.tasks[t.id]?.status === STATUS.PENDING,
  );

  if (pendingTasks.length === 0) {
    console.log("No pending tasks — nothing to do.");
    removeLockFile(absOutput);
    return 0;
  }

  console.log(`Running ${pendingTasks.length} tasks in parallel (up to ${parallel} concurrent workers)...`);
  saveState(state, absOutput);

  // Build prompt map
  const prompts = new Map<string, string>();
  for (const task of pendingTasks) {
    const template = loadPrompt(task.promptFile);
    const vars = buildPromptVars({ taskId: task.id, targetDir: absTarget, outputDir: absOutput });
    prompts.set(task.id, renderPrompt(template, vars));
  }

  const pool = new WorkerPool({
    tasks: pendingTasks.map((t) => t.id),
    prompts,
    concurrency: parallel,
    targetDir: absTarget,
    outputDir: absOutput,
    config,
  });

  const startTime = Date.now();
  const activeStartTimes = new Map<string, number>();

  const checkpointInterval = setInterval(() => saveState(state, absOutput), 30_000);

  let progressInterval: NodeJS.Timeout | null = null;
  if (isTTY) {
    progressInterval = setInterval(() => {
      const activeFiles = new Map<string, { index: number; startedAt: number }>();
      for (const [tid, idx] of pool.getActiveTasks()) {
        activeFiles.set(tid, { index: idx, startedAt: activeStartTimes.get(tid) ?? Date.now() });
      }
      printTTYProgress({
        stats: state.stats,
        activeFiles,
        elapsed: Date.now() - startTime,
        concurrency: parallel,
        targetDir: absTarget,
      });
    }, 500);
  }

  // Signal handling
  let shuttingDown = false;
  const handleSignal = () => {
    if (shuttingDown) {
      console.log("\nForce stopping...");
      pool.killAll();
      saveState(state, absOutput);
      removeLockFile(absOutput);
      if (progressInterval) clearInterval(progressInterval);
      clearInterval(checkpointInterval);
      process.exit(130);
    }
    shuttingDown = true;
    console.log(`\nStopping gracefully... ${pool.activeCount} running. Ctrl+C again to force quit.`);
    pool.stopAcceptingNew();
  };
  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);

  // Rate limit / auth error tracking
  let consecutiveAuthErrors = 0;
  const FATAL_AUTH_THRESHOLD = 3;
  let rateLimitPaused = false;
  let rateLimitTimer: NodeJS.Timeout | null = null;
  const DEFAULT_RATE_LIMIT_RETRY_MS = 15 * 60 * 1000;
  const PENALTY_MS = 60 * 1000;

  pool.on("start", (taskId: string) => {
    activeStartTimes.set(taskId, Date.now());
    updateTaskStatus(state, taskId, STATUS.RUNNING, {
      startedAt: new Date().toISOString(),
      attempts: (state.tasks[taskId]?.attempts ?? 0) + 1,
    });
  });

  pool.on("done", (taskId: string, result: { status: string; durationMs: number; exitCode: number | null; error?: string; retryAfterMs?: number }) => {
    activeStartTimes.delete(taskId);

    if (result.status === STATUS.COMPLETED) {
      consecutiveAuthErrors = 0;
      updateTaskStatus(state, taskId, STATUS.COMPLETED, {
        completedAt: new Date().toISOString(),
        durationMs: result.durationMs,
        exitCode: result.exitCode,
      });
      printEventAboveProgress(formatLogLine("DONE", taskId, formatDuration(result.durationMs)));
    } else if (result.status === STATUS.TIMEOUT) {
      consecutiveAuthErrors = 0;
      updateTaskStatus(state, taskId, STATUS.TIMEOUT, {
        completedAt: new Date().toISOString(),
        durationMs: result.durationMs,
        exitCode: result.exitCode,
        lastError: "timeout",
      });
      printEventAboveProgress(formatLogLine("TIMEOUT", taskId, `exceeded ${timeout}s`));
    } else {
      updateTaskStatus(state, taskId, STATUS.FAILED, {
        completedAt: new Date().toISOString(),
        durationMs: result.durationMs,
        exitCode: result.exitCode,
        lastError: result.error,
      });
      printEventAboveProgress(formatLogLine("FAIL", taskId, result.error ?? "unknown error"));

      if (result.error === "auth_error") {
        consecutiveAuthErrors++;
        if (consecutiveAuthErrors >= FATAL_AUTH_THRESHOLD) {
          printEventAboveProgress("Error: Claude is not authenticated. Run: claude auth login");
          pool.killAll();
        }
      } else if (result.error === "rate_limit" || result.error === "overloaded") {
        pool.requeueTask(taskId);
        updateTaskStatus(state, taskId, STATUS.PENDING);
        if (!rateLimitPaused) {
          rateLimitPaused = true;
          pool.pause();
          const delay = result.retryAfterMs ? result.retryAfterMs + PENALTY_MS : DEFAULT_RATE_LIMIT_RETRY_MS;
          if (result.retryAfterMs) {
            printEventAboveProgress(`Rate limited. Auto-resume at ${new Date(Date.now() + delay).toLocaleTimeString()}.`);
          } else {
            printEventAboveProgress("Rate limited. Will auto-resume when ready.");
          }
          rateLimitTimer = setTimeout(() => { rateLimitPaused = false; pool.resume(); }, delay);
        }
      } else {
        consecutiveAuthErrors = 0;
      }
    }

    saveState(state, absOutput);
  });

  await pool.start();

  // Cleanup
  clearInterval(checkpointInterval);
  if (progressInterval) clearInterval(progressInterval);
  if (rateLimitTimer) clearTimeout(rateLimitTimer);
  clearProgress();
  process.removeListener("SIGINT", handleSignal);
  process.removeListener("SIGTERM", handleSignal);

  state.stats = computeStats(state.tasks);
  saveState(state, absOutput);

  const reportPath = writeReport(absOutput, state);
  const elapsed = formatDuration(Date.now() - startTime);

  console.log(`\nDone. ${state.stats.completed}/${state.stats.totalTasks} tasks in ${elapsed}.`);
  if (state.stats.failed > 0 || state.stats.timeout > 0) {
    console.log(`  ${state.stats.failed} failed, ${state.stats.timeout} timed out.`);
    console.log("  Retry:  claude-harness ./project --resume --retry");
  }
  console.log(`  Report: ${reportPath}`);

  removeLockFile(absOutput);
  return state.stats.failed > 0 ? 1 : 0;
}

function askYesNo(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}
