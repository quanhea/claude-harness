#!/usr/bin/env node
// src/cli.ts — CLI entry point
import * as path from "path";
import { setup } from "./scanner";
import { gardenerCommand } from "./gardener-api";
import { startClaude } from "./start-claude";
import { DEFAULTS } from "./types";
import { suspendWorktreeHook, restoreWorktreeHook } from "./hooks-suspension";

function printHelp(): void {
  console.log(`
claude-harness — agent-first project scaffold powered by Claude Code

Usage:
  claude-harness [target-dir] [options]      Set up a project
  claude-harness start-claude [target-dir]   Start claude with harness context
  claude-harness gardener <subcommand>       Manage doc-gardening schedules

Setup options:
  -j, --parallel <n>        Parallel workers per phase  (default: ${DEFAULTS.parallel})
  -t, --timeout <seconds>   Per-task timeout            (default: ${DEFAULTS.timeout})
      --resume               (legacy no-op — every run is now a resume)
      --retry                Also re-run failed/timed-out tasks
      --only <id,...>        Run only these task IDs — forces re-run even if already completed (e.g. --only claude-md,rule-git)
  -o, --output <dir>        Output directory            (default: .claude-harness)
      --model <model>        Claude model to use
      --max-turns <n>        Max Claude turns per task   (default: ${DEFAULTS.maxTurns})
      --dry-run              List tasks without running
      --force                Override run lock
  -v, --verbose              Verbose output
  -h, --help                 Show this help
      --version              Show version

start-claude options:
  [target-dir]              Project directory (default: current directory)
  [-- ...claude-args]       Extra args passed through to the claude binary

Gardener subcommands:
  claude-harness gardener add <project-dir> [--schedule <cron>]
  claude-harness gardener remove <project-dir>
  claude-harness gardener list
  claude-harness gardener run <project-dir>

Examples:
  claude-harness ./my-project
  claude-harness ./my-project --only claude-md,rule-git
  claude-harness ./my-project --retry
  claude-harness start-claude ./my-project
  claude-harness start-claude ./my-project -- --model claude-opus-4-6
  claude-harness gardener add ./my-project --schedule "0 9 * * 1-5"
  claude-harness gardener list
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args[0] === "start-claude") {
    const exitCode = await startClaude(args.slice(1));
    process.exit(exitCode);
    return;
  }

  if (args[0] === "gardener") {
    const exitCode = await gardenerCommand(args.slice(1));
    process.exit(exitCode);
    return;
  }

  // Parse setup args
  const options: Record<string, string | boolean> = {};
  let targetDir = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") { options.help = true; }
    else if (arg === "--version") { options.version = true; }
    else if (arg === "--resume") { options.resume = true; }
    else if (arg === "--retry") { options.retry = true; }
    else if (arg === "--dry-run") { options.dryRun = true; }
    else if (arg === "--force") { options.force = true; }
    else if (arg === "--verbose" || arg === "-v") { options.verbose = true; }
    else if ((arg === "--parallel" || arg === "-j") && i + 1 < args.length) { options.parallel = args[++i]; }
    else if ((arg === "--timeout" || arg === "-t") && i + 1 < args.length) { options.timeout = args[++i]; }
    else if ((arg === "--output" || arg === "-o") && i + 1 < args.length) { options.output = args[++i]; }
    else if (arg === "--model" && i + 1 < args.length) { options.model = args[++i]; }
    else if (arg === "--max-turns" && i + 1 < args.length) { options.maxTurns = args[++i]; }
    else if (arg === "--only" && i + 1 < args.length) {
      const val = args[++i];
      options.only = options.only ? `${options.only},${val}` : val;
    }
    else if (!arg.startsWith("-")) { targetDir = arg; }
    else { console.error(`Unknown option: ${arg}`); process.exit(1); }
  }

  if (options.version) {
    const pkg = require("../package.json");
    console.log(pkg.version);
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  const resolvedTarget = targetDir ? path.resolve(targetDir) : process.cwd();
  const outputDir = typeof options.output === "string"
    ? options.output
    : path.join(resolvedTarget, DEFAULTS.outputDir);

  // --retry implies --resume (retrying only makes sense on an existing run)
  const retry = !!options.retry;
  const resume = !!options.resume || retry;

  // Temporarily remove the enforce-worktree PreToolUse hook from
  // process.cwd()/.claude/settings.json so claude subprocesses can write
  // freely during scaffold. Restore verbatim on any exit (normal or signal).
  if (!options.dryRun) {
    const original = suspendWorktreeHook();
    if (original !== null) {
      process.on("exit", () => restoreWorktreeHook(original));
    }
  }

  const exitCode = await setup({
    targetDir: resolvedTarget,
    targetArg: targetDir || null,
    outputDir,
    parallel: Number(options.parallel) || DEFAULTS.parallel,
    timeout: Number(options.timeout) || DEFAULTS.timeout,
    maxRetries: DEFAULTS.maxRetries,
    maxTurns: Number(options.maxTurns) || DEFAULTS.maxTurns,
    model: (options.model as string) ?? null,
    only: options.only ? (options.only as string).split(",").map((s) => s.trim()) : null,
    resume,
    retry,
    dryRun: !!options.dryRun,
    force: !!options.force,
    verbose: !!options.verbose,
  });

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
