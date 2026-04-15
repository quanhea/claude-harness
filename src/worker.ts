// src/worker.ts — spawn claude -p processes
import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { WorkerResult, STATUS, HarnessConfig } from "./types";
import { renderPrompt } from "./prompt";

// --- Shared claude spawner (used by both per-file scan and summary) ---

export interface ClaudeSpawnOptions {
  prompt: string;
  cwd: string;
  logPath: string;
  rawPath: string;
  config: HarnessConfig;
}

export interface ClaudeSpawnResult {
  exitCode: number | null;
  durationMs: number;
  killed: boolean;
  isError: boolean;
  error?: string;
  result?: string;
  cost?: number;
  retryAfterMs?: number;
}

// Parse "resets 2am (Asia/Saigon)" → ms until that time
export function parseResetTime(msg: string): number | undefined {
  const match = msg.match(/resets\s+(\d{1,2})(am|pm)?\s*\(([^)]+)\)/i);
  if (!match) return undefined;
  const hour12 = parseInt(match[1], 10);
  const ampm = match[2]?.toLowerCase();
  const tz = match[3];

  let hour24 = hour12;
  if (ampm === "pm" && hour12 < 12) hour24 = hour12 + 12;
  if (ampm === "am" && hour12 === 12) hour24 = 0;

  // Get current time in the target timezone
  const now = new Date();
  const tzNow = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const localNow = new Date(now.toLocaleString("en-US"));
  const tzOffset = localNow.getTime() - tzNow.getTime();

  // Target time in the target timezone
  const target = new Date(tzNow);
  target.setHours(hour24, 0, 0, 0);
  // If target is in the past, it means tomorrow
  if (target.getTime() <= tzNow.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const targetLocal = target.getTime() + tzOffset;
  const waitMs = targetLocal - now.getTime();
  return waitMs > 0 ? waitMs : undefined;
}

export function spawnClaude(options: ClaudeSpawnOptions): {
  child: ChildProcess;
  promise: Promise<ClaudeSpawnResult>;
  kill: () => void;
} {
  const { prompt, cwd, logPath, rawPath, config } = options;

  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.mkdirSync(path.dirname(rawPath), { recursive: true });

  const args: string[] = [
    // Belt-and-suspenders permission bypass. --dangerously-skip-permissions is the
    // legacy flag; --permission-mode bypassPermissions is the newer-API equivalent.
    // Together they cover post-v2.1.78 protected-directory behavior where writes
    // to .claude/, .git/, .vscode/, .husky/ would otherwise still prompt.
    "--dangerously-skip-permissions",
    "--permission-mode", "bypassPermissions",
    "-p",
    prompt,
    "--output-format",
    "json",
    "--no-session-persistence",
  ];

  // Only pass --max-turns when the prompt (or global default) actually wants
  // a cap. null / 0 / negative → omit, letting Claude run until it finishes.
  if (config.maxTurns !== null && config.maxTurns > 0) {
    args.push("--max-turns", String(config.maxTurns));
  }

  if (config.model) args.push("--model", config.model);
  if (config.verbose) args.push("--verbose");

  const logStream = fs.createWriteStream(logPath, { flags: "w" });

  const child = spawn("claude", args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  let killed = false;
  let timeoutTimer: NodeJS.Timeout | null = null;
  let hangTimer: NodeJS.Timeout | null = null;
  let lastActivity = Date.now();
  let lastStdoutChunk = "";

  if (child.stdout) {
    child.stdout.on("data", (data: Buffer) => {
      lastActivity = Date.now();
      lastStdoutChunk = data.toString();
    });
    child.stdout.pipe(logStream);
  }
  if (child.stderr) {
    child.stderr.on("data", () => { lastActivity = Date.now(); });
    child.stderr.pipe(logStream);
  }

  const kill = () => {
    if (killed) return;
    killed = true;
    try { child.kill("SIGTERM"); } catch {}
    setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, 5000);
  };

  if (config.timeout > 0) {
    timeoutTimer = setTimeout(() => { if (!killed) kill(); }, config.timeout * 1000);
  }

  // Hang detection only with --verbose (json mode has no output until done)
  if (config.verbose) {
    const HANG_CHECK_INTERVAL = 30_000;
    const HANG_THRESHOLD = 120_000;
    hangTimer = setInterval(() => {
      if (Date.now() - lastActivity > HANG_THRESHOLD && !killed) kill();
    }, HANG_CHECK_INTERVAL);
  }

  const startTime = Date.now();

  const promise = new Promise<ClaudeSpawnResult>((resolve) => {
    child.on("exit", (code, signal) => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (hangTimer) clearInterval(hangTimer);
      logStream.end();

      const durationMs = Date.now() - startTime;
      const exitCode = code ?? (signal ? 128 + (signalNumber(signal) || 0) : 1);

      // Parse JSON response
      let isError = false;
      let claudeResult: string | undefined;
      let cost: number | undefined;

      try {
        const raw = lastStdoutChunk.trim() ||
          (fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf-8").trim() : "");
        if (raw) {
          const parsed = JSON.parse(raw);
          fs.writeFileSync(rawPath, JSON.stringify(parsed, null, 2));
          isError = parsed.is_error === true;
          claudeResult = parsed.result;
          cost = parsed.total_cost_usd;
        }
      } catch {}

      // Classify error
      let error: string | undefined;
      let retryAfterMs: number | undefined;
      if (killed || exitCode !== 0 || isError) {
        const msg = claudeResult || "";
        if (msg.includes("Not logged in") || msg.includes("/login")) {
          error = "auth_error";
        } else if (
          msg.includes("rate_limit") ||
          msg.includes("429") ||
          msg.includes("hit your limit") ||
          msg.includes("hit the rate limit") ||
          msg.includes("usage limit")
        ) {
          error = "rate_limit";
          retryAfterMs = parseResetTime(msg);
        } else if (msg.includes("overloaded") || msg.includes("529")) {
          error = "overloaded";
        } else {
          error = msg || `exit_code_${exitCode}`;
        }
      }

      resolve({ exitCode, durationMs, killed, isError, error, result: claudeResult, cost, retryAfterMs });
    });

    child.on("error", (err) => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (hangTimer) clearInterval(hangTimer);
      logStream.end();
      resolve({
        exitCode: null,
        durationMs: Date.now() - startTime,
        killed: false,
        isError: true,
        error: err.message.includes("ENOENT") ? "claude_not_found" : err.message,
      });
    });
  });

  return { child, promise, kill };
}

// --- Per-task worker (thin wrapper) ---

export interface SpawnOptions {
  targetDir: string;
  outputDir: string;
  taskId: string;
  promptTemplate: string;
  config: HarnessConfig;
}

export function taskToSlug(taskId: string): string {
  return taskId.replace(/\//g, "__");
}

export function spawnTask(options: SpawnOptions): {
  child: ChildProcess;
  promise: Promise<WorkerResult>;
  kill: () => void;
} {
  const { targetDir, outputDir, taskId, promptTemplate, config } = options;
  const slug = taskToSlug(taskId);

  fs.mkdirSync(path.join(outputDir, "reports"), { recursive: true });

  const reportPath = path.join(outputDir, "reports", slug + ".md");
  const logPath = path.join(outputDir, "logs", slug + ".log");
  const rawPath = path.join(outputDir, "raw", slug + ".json");

  const prompt = renderPrompt(promptTemplate, {
    PROJECT_DIR: targetDir,
    OUTPUT_DIR: outputDir,
    TASK_ID: taskId,
    DISCOVERY_JSON: path.join(outputDir, "discovery.json"),
  });

  const { child, promise: claudePromise, kill } = spawnClaude({
    prompt, cwd: targetDir, logPath, rawPath, config,
  });

  const promise = claudePromise.then((r): WorkerResult => {
    let status: string = STATUS.COMPLETED;
    if (r.killed) status = STATUS.TIMEOUT;
    else if (r.exitCode !== 0 || r.isError) status = STATUS.FAILED;

    return {
      taskId,
      status: status as WorkerResult["status"],
      exitCode: r.exitCode,
      durationMs: r.durationMs,
      error: r.error,
      retryAfterMs: r.retryAfterMs,
    };
  });

  return { child, promise, kill };
}

function signalNumber(signal: string): number | undefined {
  const signals: Record<string, number> = { SIGTERM: 15, SIGKILL: 9, SIGINT: 2 };
  return signals[signal];
}
