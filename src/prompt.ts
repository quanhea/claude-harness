// src/prompt.ts — load and template prompt files
import * as fs from "fs";
import * as path from "path";

const PROMPTS_DIR = path.join(__dirname, "..", "prompts");

// Per-prompt metadata parsed from optional YAML-like frontmatter.
// Example header in a prompt file:
//
//   ---
//   description: Generate CLAUDE.md (~100 lines, table of contents)
//   outputs: ["CLAUDE.md"]
//   max-turns: null
//   ---
//
//   # Task: Generate ...
//
// All fields optional. `description` shows up in --dry-run and the report.
// `outputs` lists files (relative to PROJECT_DIR) used for on-disk
// reconciliation — if any is missing from disk, the task gets re-queued.
// `max-turns: null` omits the --max-turns flag entirely (Claude runs to
// natural completion); a number caps at that turn count for this prompt.
export interface PromptMeta {
  description?: string;
  outputs?: string[];
  maxTurns?: number | null;
}

export interface LoadedPrompt {
  text: string;     // template body with frontmatter stripped
  meta: PromptMeta;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function parseFrontmatter(content: string): { meta: PromptMeta; body: string } {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return { meta: {}, body: content };

  const meta: PromptMeta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const raw = m[2].trim();
    switch (key) {
      case "max-turns":
        if (raw === "null" || raw === "~" || raw === "") {
          meta.maxTurns = null;
        } else {
          const n = Number(raw);
          if (Number.isFinite(n)) meta.maxTurns = n;
        }
        break;
      case "description":
        // Single-line string. Strip surrounding quotes if present.
        meta.description = raw.replace(/^["'](.*)["']$/, "$1");
        break;
      case "outputs":
        // Inline JSON array notation: outputs: ["a", "b"]
        if (raw.startsWith("[")) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
              meta.outputs = parsed;
            }
          } catch { /* ignore malformed; leaves outputs undefined */ }
        }
        break;
    }
  }
  return { meta, body: match[2] };
}

export function loadPrompt(promptFile: string): LoadedPrompt {
  let raw: string;
  if (fs.existsSync(promptFile)) {
    raw = fs.readFileSync(promptFile, "utf-8");
  } else {
    const bundled = path.join(PROMPTS_DIR, promptFile);
    if (!fs.existsSync(bundled)) {
      throw new Error(`Prompt file not found: ${promptFile}`);
    }
    raw = fs.readFileSync(bundled, "utf-8");
  }
  const { meta, body } = parseFrontmatter(raw);
  return { text: body.trim(), meta };
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
