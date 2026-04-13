// src/prompt.ts — load and template prompt files
import * as fs from "fs";
import * as path from "path";

const PROMPTS_DIR = path.join(__dirname, "..", "prompts");

export function loadPrompt(promptFile: string): string {
  if (fs.existsSync(promptFile)) {
    return fs.readFileSync(promptFile, "utf-8").trim();
  }
  const bundled = path.join(PROMPTS_DIR, promptFile);
  if (fs.existsSync(bundled)) {
    return fs.readFileSync(bundled, "utf-8").trim();
  }
  throw new Error(`Prompt file not found: ${promptFile}`);
}

export function renderPrompt(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

// Every task prompt gets these three vars — nothing else.
export function buildPromptVars(opts: {
  taskId: string;
  targetDir: string;
  outputDir: string;
}): Record<string, string> {
  return {
    PROJECT_DIR: opts.targetDir,
    OUTPUT_DIR: opts.outputDir,
    TASK_ID: opts.taskId,
  };
}
