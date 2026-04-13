// src/preflight.ts — validate environment before scanning
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export function checkClaudeInstalled(): void {
  try {
    execFileSync("claude", ["--version"], { stdio: "pipe" });
  } catch {
    throw new Error(
      "Claude Code is not installed.\n" +
        "  Install: npm install -g @anthropic-ai/claude-code\n" +
        "  Docs:    https://code.claude.com/docs/en/quickstart",
    );
  }
}

export function checkClaudeAuth(): void {
  try {
    const out = execFileSync("claude", ["auth", "status"], { stdio: "pipe" });
    const text = out.toString();
    if (
      text.includes('"authenticated":false') ||
      text.includes("not logged in")
    ) {
      throw new Error("not authenticated");
    }
  } catch {
    throw new Error(
      "Claude Code is not authenticated.\n  Run: claude auth login",
    );
  }
}

export interface TargetCheckResult {
  singleFile: string | null;
}

export function checkTargetDir(targetDir: string): TargetCheckResult {
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Target not found: ${targetDir}`);
  }
  const stat = fs.statSync(targetDir);
  if (!stat.isDirectory()) {
    return { singleFile: targetDir };
  }
  return { singleFile: null };
}

export function checkLockFile(outputDir: string, force: boolean): void {
  const lockPath = path.join(outputDir, "harness.lock");
  if (!fs.existsSync(lockPath)) return;

  let lock: { pid: number; startedAt: string };
  try {
    lock = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
  } catch {
    // Corrupt lock file — remove it
    fs.unlinkSync(lockPath);
    return;
  }

  // Check if the PID is still alive
  let alive = false;
  try {
    process.kill(lock.pid, 0);
    alive = true;
  } catch {
    alive = false;
  }

  if (alive && !force) {
    throw new Error(
      `Another setup is running (PID ${lock.pid}).\n  Use --force to override.`,
    );
  }

  if (!alive) {
    process.stderr.write(
      "Warning: stale lock from crashed setup. Overriding.\n",
    );
  }
}

export function createLockFile(outputDir: string): void {
  fs.mkdirSync(outputDir, { recursive: true });
  const lockPath = path.join(outputDir, "harness.lock");
  fs.writeFileSync(
    lockPath,
    JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString(),
      hostname: os.hostname(),
    }),
  );
}

export function removeLockFile(outputDir: string): void {
  const lockPath = path.join(outputDir, "harness.lock");
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // Already gone
  }
}

export function runPreflight(
  targetDir: string,
  outputDir: string,
  { force = false }: { force?: boolean } = {},
): TargetCheckResult {
  checkClaudeInstalled();
  checkClaudeAuth();
  const result = checkTargetDir(targetDir);
  checkLockFile(outputDir, force);
  createLockFile(outputDir);
  return result;
}
