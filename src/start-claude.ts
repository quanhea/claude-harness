// src/start-claude.ts — start an interactive claude session with harness
// methodology pre-loaded as additional system context.
//
// Mechanism: `claude --append-system-prompt "<rendered content>"` starts an
// interactive REPL with the harness onboarding doc appended to Claude's
// built-in system prompt. --append-system-prompt preserves all of Claude
// Code's built-in tools and awareness (vs --system-prompt which replaces
// everything). stdio is inherited so the TTY is fully handed to claude.
//
// Override: if <targetDir>/.claude/start-claude.md exists, it is used
// instead of the bundled prompts/start-claude.md. This lets each project
// ship its own harness onboarding without touching the harness source.

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { loadPrompt, renderPrompt } from "./prompt";
import { TASK_MANIFEST } from "./types";

// Build the dynamic task table from each prompt's frontmatter description.
function buildTaskTable(): string {
  return TASK_MANIFEST.map((t) => {
    let desc: string;
    let flags: string[] = [];
    try {
      const meta = loadPrompt(t.promptFile).meta;
      desc = meta.description ?? t.id;
      if (meta.alwaysRun) flags.push("always-run");
      if (meta.maxTurns === null) flags.push("unlimited turns");
      if (meta.outputs?.length) flags.push(`→ ${meta.outputs.join(", ")}`);
    } catch {
      desc = t.id;
    }
    const suffix = flags.length ? ` *(${flags.join(" | ")})*` : "";
    return `| \`${t.id}\` | ${desc}${suffix} |`;
  }).join("\n");
}

export async function startClaude(args: string[]): Promise<number> {
  // Parse: [target-dir] [-- ...passthrough-to-claude]
  let targetDir = process.cwd();
  const passthroughStart = args.indexOf("--");
  const rawArgs = passthroughStart !== -1 ? args.slice(0, passthroughStart) : args;
  const passthroughArgs = passthroughStart !== -1 ? args.slice(passthroughStart + 1) : [];

  if (rawArgs[0] && !rawArgs[0].startsWith("-")) {
    targetDir = path.resolve(rawArgs[0]);
  }

  if (!fs.existsSync(targetDir)) {
    process.stderr.write(`Error: target directory not found: ${targetDir}\n`);
    return 1;
  }

  // Resolve prompt: project-local override takes precedence over bundled.
  const localOverride = path.join(targetDir, ".claude", "start-claude.md");
  const promptSource = fs.existsSync(localOverride) ? localOverride : "start-claude.md";
  const source = promptSource === localOverride ? "project-local" : "bundled";

  let systemContext: string;
  try {
    const loaded = loadPrompt(promptSource);
    systemContext = renderPrompt(loaded.text, {
      PROJECT_DIR: targetDir,
      TASK_TABLE: buildTaskTable(),
      TASK_COUNT: String(TASK_MANIFEST.length),
    });
  } catch (err: any) {
    console.error(`Error loading start-claude prompt: ${err.message}`);
    return 1;
  }

  console.error(`claude-harness start-claude (${source} prompt, project: ${targetDir})`);
  if (passthroughArgs.length > 0) {
    console.error(`Passing through to claude: ${passthroughArgs.join(" ")}`);
  }

  // Hand the terminal over to claude with the harness context appended.
  const claudeArgs = ["--append-system-prompt", systemContext, ...passthroughArgs];

  const child = spawn("claude", claudeArgs, {
    stdio: "inherit",
    cwd: targetDir,
    env: { ...process.env },
  });

  return new Promise((resolve) => {
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        console.error("Error: claude binary not found. Install Claude Code: https://claude.ai/code");
      } else {
        console.error(`Error starting claude: ${err.message}`);
      }
      resolve(1);
    });
  });
}
