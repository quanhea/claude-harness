// src/scanner.ts — top-level orchestrator (flat parallel task runner)
import * as fs from "fs";
import * as path from "path";
import { checkbox } from "@inquirer/prompts";
import { HarnessOptions, STATUS, TASK_MANIFEST, TaskDefinition } from "./types";
import { runPreflight, removeLockFile } from "./preflight";
import { loadPrompt, renderPrompt, buildPromptVars } from "./prompt";
import {
  initState,
  loadState,
  saveState,
  resetStaleRunning,
  resetFailed,
  mergeNewTasks,
  updateTaskStatus,
  computeStats,
} from "./state";
import { WorkerPool, PromptEntry } from "./worker-pool";
import { writeReport } from "./reporter";
import {
  isTTY,
  printEventAboveProgress,
  clearProgress,
  formatDuration,
  formatLogLine,
  printTTYProgress,
} from "./progress";

export function selectTasks(only: string[] | null): TaskDefinition[] {
  // --only is an explicit override — always run the named tasks regardless of disabled flag.
  if (only && only.length > 0) {
    const set = new Set(only);
    return TASK_MANIFEST.filter((t) => set.has(t.id));
  }

  // Normal run: exclude tasks with `disabled: true` in their frontmatter.
  return TASK_MANIFEST.filter((t) => {
    try { return !loadPrompt(t.promptFile).meta.disabled; } catch { return true; }
  });
}

// Output existence check with full glob support.
// Patterns that work:
//   "CLAUDE.md"                          → literal existsSync (fast path)
//   ".claude/skills/*/SKILL.md"          → single-segment wildcard
//   "docs/**/*.md"                       → recursive **
//   ".claude/{hooks,rules}/*.md"         → brace expansion
//   "src/auth/?[!_]*.ts"                 → ? and char classes
//
// Translates the glob to a RegExp and walks from the deepest static prefix
// of the pattern. Bounded recursion + a small ignore list keep the walk
// cheap even on large repos.

const GLOB_WALK_IGNORE = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".turbo",
  ".cache", "__pycache__", ".venv", "venv", ".mypy_cache",
]);
const GLOB_WALK_MAX_DEPTH = 10;

function escapeRegex(s: string): string {
  return s.replace(/[.+^$|()[\]\\]/g, "\\$&");
}

export function globToRegex(glob: string): RegExp {
  let out = "";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";          // ** crosses path separators
        i += 2;
        if (glob[i] === "/") i++; // collapse "**/" into ".*"
      } else {
        out += "[^/]*";       // single * stays within a segment
        i++;
      }
    } else if (c === "?") {
      out += "[^/]";
      i++;
    } else if (c === "{") {
      const close = glob.indexOf("}", i);
      if (close === -1) { out += "\\{"; i++; continue; }
      const alts = glob.slice(i + 1, close).split(",").map(escapeRegex);
      out += "(?:" + alts.join("|") + ")";
      i = close + 1;
    } else {
      out += escapeRegex(c);
      i++;
    }
  }
  return new RegExp("^" + out + "$");
}

// Deepest path prefix free of glob metacharacters — start the walk there.
export function staticPrefix(glob: string): string {
  const meta = glob.search(/[*?{]/);
  if (meta === -1) return glob;
  const slash = glob.lastIndexOf("/", meta);
  return slash === -1 ? "" : glob.slice(0, slash);
}

export function outputExists(rootDir: string, pattern: string): boolean {
  if (!/[*?{]/.test(pattern)) {
    return fs.existsSync(path.join(rootDir, pattern));
  }
  const regex = globToRegex(pattern);
  const startRel = staticPrefix(pattern);
  const startAbs = path.join(rootDir, startRel);
  if (!fs.existsSync(startAbs)) return false;
  return walkMatch(rootDir, startRel, regex, 0);
}

// Idempotently append `.claude-harness/` to the target project's .gitignore.
// Guards against duplicates via (a) our sentinel comment and (b) a normalized
// match that treats `.claude-harness`, `.claude-harness/`, `/.claude-harness`,
// and `/.claude-harness/` as equivalent — all of them ignore our state dir.
// Migrate old <project>/.claude-harness/ to ~/.claude-harness/projects/<slug>/.
function migrateOldStateDir(targetDir: string, newOutputDir: string): void {
  const oldDir = path.join(targetDir, ".claude-harness");
  if (!fs.existsSync(path.join(oldDir, "state.json"))) return;
  if (fs.existsSync(path.join(newOutputDir, "state.json"))) return;
  fs.mkdirSync(newOutputDir, { recursive: true });
  fs.cpSync(oldDir, newOutputDir, { recursive: true });
  fs.rmSync(oldDir, { recursive: true, force: true });
  console.log(`Migrated .claude-harness/ to ${newOutputDir}`);
  // Clean up the gitignore entry we used to add
  const gitignorePath = path.join(targetDir, ".gitignore");
  const SENTINEL = "# claude-harness: local state — never track";
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    if (content.includes(SENTINEL)) {
      const cleaned = content.replace(new RegExp(`\\n?${SENTINEL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n\\.claude-harness/\\n?`, "g"), "\n");
      fs.writeFileSync(gitignorePath, cleaned.replace(/\n{3,}/g, "\n\n"));
    }
  }
}

function walkMatch(rootDir: string, relPath: string, regex: RegExp, depth: number): boolean {
  if (depth > GLOB_WALK_MAX_DEPTH) return false;
  const absPath = relPath ? path.join(rootDir, relPath) : rootDir;
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(absPath, { withFileTypes: true }); } catch { return false; }
  for (const entry of entries) {
    if (GLOB_WALK_IGNORE.has(entry.name)) continue;
    // Build POSIX-style relative path so the regex matches consistently
    // regardless of platform.
    const childRel = relPath ? `${relPath}/${entry.name}` : entry.name;
    if (regex.test(childRel)) return true;
    if (entry.isDirectory()) {
      if (walkMatch(rootDir, childRel, regex, depth + 1)) return true;
    }
  }
  return false;
}

export async function setup(options: HarnessOptions): Promise<number> {
  const {
    targetDir, outputDir, parallel, timeout, maxRetries, maxTurns, model,
    only, retry, dryRun, force, verbose,
  } = options;

  const absTarget = path.resolve(targetDir);
  const absOutput = path.resolve(outputDir);

  runPreflight(absTarget, absOutput, { force });

  const config = { parallel, timeout, maxRetries, maxTurns, model, verbose };
  const selectedTasks = selectTasks(only);

  // Resolve every task's frontmatter ONCE up-front. The orchestrator needs
  // descriptions (for --dry-run + summary), outputs (for on-disk
  // reconciliation), and per-task max-turns (passed to the worker pool).
  // All three live in each prompt's YAML frontmatter — see src/prompt.ts.
  const meta = new Map<string, ReturnType<typeof loadPrompt>>();
  for (const task of TASK_MANIFEST) meta.set(task.id, loadPrompt(task.promptFile));
  const desc = (id: string) => meta.get(id)?.meta.description ?? id;

  // Dry run — list and exit
  if (dryRun) {
    removeLockFile(absOutput);
    console.log(`Would run ${selectedTasks.length} tasks in parallel:`);
    for (const t of selectedTasks) console.log(`  [${t.id}] ${desc(t.id)}`);
    // Show any disabled tasks so they're not silently invisible.
    if (!only) {
      const disabled = TASK_MANIFEST.filter((t) => {
        try { return !!meta.get(t.id)?.meta.disabled; } catch { return false; }
      });
      if (disabled.length > 0) {
        console.log(`\nDisabled (skipped — use --only to run):`);
        for (const t of disabled) console.log(`  [${t.id}] ${desc(t.id)}`);
      }
    }
    return 0;
  }

  // Append `.claude-harness/` to the target's .gitignore if not already
  // there. The whole dir is transient — state.json, logs, debug, and the
  // conversations extraction — no reason to track any of it. Teammates get
  // the committed output files (CLAUDE.md, docs/, .claude/) and the scanner
  // reconciles against them.
  migrateOldStateDir(absTarget, absOutput);

  // Unified state load — every run behaves like a resume that also picks up
  // any new tasks added to the manifest since the last run.
  //
  // Only enabled (non-disabled) tasks go into state. This keeps totalTasks
  // accurate and prevents disabled tasks from inflating the denominator in
  // the progress bar or the Remaining count.
  const enabledIds = new Set(
    TASK_MANIFEST
      .filter((t) => { try { return !meta.get(t.id)?.meta.disabled; } catch { return true; } })
      .map((t) => t.id)
  );
  const allTaskIds = [...enabledIds];
  let state = loadState(absOutput);

  if (!state) {
    state = initState(absTarget, allTaskIds, config);
  } else {
    state.config = config;

    // Prune tasks that became disabled since the last run (e.g. a package
    // upgrade disabled previously-enabled tasks). Remove them so stats stay
    // accurate — disabled tasks have no business being in state.
    const pruned = Object.keys(state.tasks).filter((id) => !enabledIds.has(id));
    if (pruned.length > 0) {
      for (const id of pruned) delete state.tasks[id];
      state.stats = computeStats(state.tasks);
      console.log(`Removed ${pruned.length} disabled task(s) from state: ${pruned.join(", ")}`);
    }

    // Merge in any tasks added to TASK_MANIFEST since the last run.
    const added = mergeNewTasks(state, allTaskIds);
    if (added > 0) {
      console.log(`Detected ${added} new task(s) from an updated claude-harness version.`);
    }

    // Reset stale RUNNING entries (previous process crashed mid-run).
    const stale = resetStaleRunning(state);
    if (stale > 0) console.log(`Reset ${stale} stale in-flight task(s) to pending.`);

    // --retry also resets FAILED/TIMEOUT.
    if (retry) {
      const failed = resetFailed(state);
      if (failed > 0) console.log(`Retry: reset ${failed} failed/timed-out task(s) to pending.`);
    }
  }

  // Bidirectional reconciliation against the target's on-disk state.
  // Runs on EVERY invocation (fresh init or resumed state), covering three cases:
  //   - COMPLETED + outputs missing   → requeue (user deleted a file)
  //   - PENDING + outputs present     → mark COMPLETED (teammate-pull: files
  //     already committed, no point regenerating)
  //   - always-run task               → always stays/resets to PENDING so the
  //     task runs on every invocation (even if its file already exists on disk).
  //     This is the right behavior for foundational files like CLAUDE.md that
  //     must stay current regardless of what's on disk.
  // Tasks with no declared outputs in frontmatter skip all three checks.
  const requeued: string[] = [];
  const detected: string[] = [];
  const alwaysReset: string[] = [];
  for (const task of TASK_MANIFEST) {
    const entry = state.tasks[task.id];
    if (!entry) continue;
    const taskMeta = meta.get(task.id)?.meta;
    const outputs = taskMeta?.outputs;
    if (!outputs || outputs.length === 0) continue;
    const allPresent = outputs.every((p) => outputExists(absTarget, p));
    const alwaysRun = taskMeta?.alwaysRun === true;

    if (alwaysRun) {
      // Reset to PENDING regardless of current status or disk state.
      if (entry.status !== STATUS.PENDING) {
        entry.status = STATUS.PENDING;
        entry.attempts = 0;
        delete entry.completedAt;
        delete entry.durationMs;
        delete entry.exitCode;
        delete entry.lastError;
        alwaysReset.push(task.id);
      }
      // If already PENDING (e.g. fresh init), nothing to do — it will run.
    } else if (entry.status === STATUS.COMPLETED && !allPresent) {
      entry.status = STATUS.PENDING;
      entry.attempts = 0;
      delete entry.completedAt;
      delete entry.durationMs;
      delete entry.exitCode;
      delete entry.lastError;
      requeued.push(task.id);
    } else if (entry.status === STATUS.PENDING && allPresent) {
      entry.status = STATUS.COMPLETED;
      entry.completedAt = new Date().toISOString();
      // attempts stays 0 — we never spawned Claude for this one
      detected.push(task.id);
    }
  }
  if (alwaysReset.length > 0 || requeued.length > 0 || detected.length > 0) {
    state.stats = computeStats(state.tasks);
    if (alwaysReset.length > 0) {
      console.log(`Always-run task(s) reset to pending: ${alwaysReset.join(", ")}`);
    }
    if (detected.length > 0) {
      console.log(`Detected ${detected.length} task(s) already present on disk — marking completed: ${detected.join(", ")}`);
    }
    if (requeued.length > 0) {
      console.log(`Detected ${requeued.length} task(s) with missing output(s) — requeuing: ${requeued.join(", ")}`);
    }
  }

  // (4) --only forces listed tasks back to PENDING (even if COMPLETED), so
  // `claude-harness --only <id>` always re-runs that task. This is the
  // "regenerate a specific file" UX.
  if (only && only.length > 0) {
    const forced: string[] = [];
    for (const id of only) {
      const entry = state.tasks[id];
      if (entry && entry.status !== STATUS.PENDING) {
        entry.status = STATUS.PENDING;
        entry.attempts = 0;
        delete entry.completedAt;
        delete entry.durationMs;
        delete entry.exitCode;
        delete entry.lastError;
        forced.push(id);
      }
    }
    if (forced.length > 0) {
      state.stats = computeStats(state.tasks);
      console.log(`Forcing re-run of ${forced.length} task(s): ${forced.join(", ")}`);
    }
  }

  const pendingTasks = selectedTasks.filter(
    (t) => state.tasks[t.id]?.status === STATUS.PENDING,
  );

  if (pendingTasks.length === 0) {
    console.log("Everything up to date — no pending tasks.");
    console.log("  Regenerate specific: claude-harness --only <id>[,<id>...]");
    console.log("  Retry failed tasks:  claude-harness --retry");
    removeLockFile(absOutput);
    return 0;
  }

  // Interactive task selection — only when running in a TTY and the user
  // hasn't already narrowed the set with --only. All tasks checked by default.
  let tasksToRun = pendingTasks;
  if (isTTY && !only) {
    const selected = await checkbox({
      message: `Select tasks to run (${pendingTasks.length} pending):`,
      choices: pendingTasks.map((t) => ({
        name: `[${t.id}] ${desc(t.id)}`,
        value: t.id,
        checked: true,
      })),
      // Show the whole list without requiring the user to scroll — tasks
      // below the fold were being missed (reported: skills appeared hidden
      // when it's item #21 of 27). Cap at a sane upper bound anyway.
      pageSize: Math.min(Math.max(pendingTasks.length, 10), 40),
    });
    tasksToRun = pendingTasks.filter((t) => selected.includes(t.id));
    if (tasksToRun.length === 0) {
      console.log("No tasks selected — nothing to run.");
      removeLockFile(absOutput);
      return 0;
    }
  } else {
    console.log(`Running ${tasksToRun.length} tasks in parallel (up to ${parallel} concurrent workers)...`);
    for (const t of tasksToRun) console.log(`  [${t.id}] ${desc(t.id)}`);
  }

  saveState(state, absOutput);

  // Build prompt map. Per-task `max-turns` override (from prompt frontmatter)
  // is forwarded to the worker pool so the global default doesn't bind a
  // heavy prompt. We re-use the meta cache loaded above.
  const prompts = new Map<string, PromptEntry>();
  const overrides: string[] = [];
  for (const task of tasksToRun) {
    const loaded = meta.get(task.id);
    if (!loaded) continue; // shouldn't happen — manifest is the source of truth
    const vars = buildPromptVars({ taskId: task.id, targetDir: absTarget, outputDir: absOutput });
    prompts.set(task.id, {
      text: renderPrompt(loaded.text, vars),
      maxTurns: loaded.meta.maxTurns,
      effort: loaded.meta.effort,
    });
    if (loaded.meta.maxTurns !== undefined) {
      const label = loaded.meta.maxTurns === null ? "unlimited" : String(loaded.meta.maxTurns);
      overrides.push(`${task.id}=${label}`);
    }
  }
  if (overrides.length > 0) {
    console.log(`Per-prompt --max-turns overrides: ${overrides.join(", ")}`);
  }

  const pool = new WorkerPool({
    tasks: tasksToRun.map((t) => t.id),
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

  // Count outcomes for THIS invocation only (not state-wide).
  const plannedIds = new Set(tasksToRun.map((t) => t.id));
  let runOk = 0, runFailed = 0, runTimeout = 0;
  for (const id of plannedIds) {
    const s = state.tasks[id]?.status;
    if (s === STATUS.COMPLETED) runOk++;
    else if (s === STATUS.FAILED) runFailed++;
    else if (s === STATUS.TIMEOUT) runTimeout++;
  }

  const reportPath = writeReport(absOutput, state, desc);
  const elapsed = formatDuration(Date.now() - startTime);

  console.log(
    `\nDone. ${runOk}/${plannedIds.size} task(s) this run in ${elapsed} ` +
    `(${state.stats.completed}/${state.stats.totalTasks} complete overall).`,
  );
  if (runFailed > 0 || runTimeout > 0) {
    console.log(`  ${runFailed} failed, ${runTimeout} timed out this run.`);
    const targetBit = options.targetArg ? `${options.targetArg} ` : "";
    console.log(`  Retry:  claude-harness ${targetBit}--retry`);
  }
  console.log(`  Report: ${reportPath}`);

  removeLockFile(absOutput);
  return runFailed > 0 ? 1 : 0;
}
