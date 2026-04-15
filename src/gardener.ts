// src/gardener.ts — doc-gardening agent that scans existing docs for staleness
// against the live code and updates them in place. Runs in a git worktree.
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { getProject, updateLastRun } from "./gardener-api";
import { loadPrompt, renderPrompt } from "./prompt";
import { spawnClaude } from "./worker";
import { DEFAULTS } from "./types";

const WORKTREE_PREFIX = ".claude-harness-gardener";

function getLatestCommit(repoDir: string): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoDir, stdio: "pipe" })
    .toString()
    .trim();
}

function createWorktree(repoDir: string, worktreePath: string): string {
  try {
    execFileSync("git", ["fetch", "origin", "main"], { cwd: repoDir, stdio: "pipe" });
  } catch {
    // offline or no remote — non-fatal
  }

  const branch = `gardener/${Date.now()}`;
  execFileSync(
    "git",
    ["worktree", "add", "-b", branch, worktreePath, "origin/main"],
    { cwd: repoDir, stdio: "pipe" },
  );

  return getLatestCommit(worktreePath);
}

function removeWorktree(repoDir: string, worktreePath: string): void {
  try {
    execFileSync("git", ["worktree", "remove", "--force", worktreePath], {
      cwd: repoDir,
      stdio: "pipe",
    });
  } catch {
    fs.rmSync(worktreePath, { recursive: true, force: true });
  }
}

function getChangedFiles(repoDir: string, fromCommit: string): string[] {
  try {
    const out = execFileSync(
      "git",
      ["diff", "--name-only", fromCommit, "HEAD"],
      { cwd: repoDir, stdio: "pipe" },
    );
    return out.toString().trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export async function runGardener(projectPath: string): Promise<number> {
  const absProject = path.resolve(projectPath);

  if (!fs.existsSync(absProject)) {
    console.error(`Project not found: ${absProject}`);
    return 1;
  }

  const project = getProject(absProject);
  if (!project) {
    console.error(`No gardener registered for ${absProject}.`);
    console.error(`Register first: claude-harness gardener add ${projectPath}`);
    return 1;
  }

  const worktreePath = path.join(absProject, `${WORKTREE_PREFIX}-${Date.now()}`);
  console.log(`Gardener: auditing docs for ${absProject}`);

  let headCommit: string;
  try {
    headCommit = createWorktree(absProject, worktreePath);
    console.log(`Worktree created at ${worktreePath} (${headCommit.slice(0, 7)})`);
  } catch (err: any) {
    console.error(`Failed to create worktree: ${err.message}`);
    return 1;
  }

  const config = {
    parallel: DEFAULTS.parallel,
    timeout: 3600,
    maxRetries: 1,
    maxTurns: DEFAULTS.maxTurns,
    model: DEFAULTS.model,
    verbose: DEFAULTS.verbose,
  };

  const outputDir = path.join(absProject, ".claude-harness");
  const logPath = path.join(outputDir, "logs", "gardener.log");
  const debugPath = path.join(outputDir, "debug", "gardener.jsonl");

  try {
    // First run: full freshness audit. Subsequent runs: only re-check docs
    // potentially affected by files changed since LAST_COMMIT.
    let promptFile: string;
    let promptVars: Record<string, string>;

    if (!project.lastWorktreeCommit) {
      console.log("First run — full documentation freshness audit.");
      promptFile = "gardener-init.md";
      promptVars = {
        PROJECT_DIR: worktreePath,
        HEAD_COMMIT: headCommit,
      };
    } else {
      const changedFiles = getChangedFiles(worktreePath, project.lastWorktreeCommit);
      console.log(`Incremental audit: ${changedFiles.length} file(s) changed since last run.`);
      promptFile = "gardener-update.md";
      promptVars = {
        PROJECT_DIR: worktreePath,
        HEAD_COMMIT: headCommit,
        LAST_COMMIT: project.lastWorktreeCommit,
        CHANGED_FILES: changedFiles.join("\n"),
      };
    }

    const loaded = loadPrompt(promptFile);
    const prompt = renderPrompt(loaded.text, promptVars);

    const { promise } = spawnClaude({ prompt, cwd: worktreePath, logPath, debugPath, config });
    const result = await promise;

    if (result.killed || result.exitCode !== 0 || result.isError) {
      console.error(`Gardener run failed: ${result.error ?? "unknown"}`);
      removeWorktree(absProject, worktreePath);
      return 1;
    }

    // Commit any doc updates
    try {
      const status = execFileSync("git", ["status", "--porcelain"], {
        cwd: worktreePath,
        stdio: "pipe",
      }).toString().trim();

      if (status) {
        // Only stage markdown files — gardener must not touch source
        execFileSync("git", ["add", "*.md", "**/*.md"], { cwd: worktreePath, stdio: "pipe" });
        execFileSync(
          "git",
          ["commit", "-m", `docs: gardener freshness pass at ${headCommit.slice(0, 7)}`],
          { cwd: worktreePath, stdio: "pipe" },
        );
        console.log("Docs updated and committed.");
      } else {
        console.log("All docs are fresh — no changes.");
      }
    } catch {
      console.log("No doc changes to commit.");
    }

    updateLastRun(absProject, headCommit);
    console.log("Gardener run complete.");
  } finally {
    removeWorktree(absProject, worktreePath);
  }

  return 0;
}
