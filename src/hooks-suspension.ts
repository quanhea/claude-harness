// src/hooks-suspension.ts — temporarily remove enforce-worktree hook from
// process.cwd()/.claude/settings.json before spawning claude subprocesses,
// then restore it exactly on exit.

import * as fs from "fs";
import * as path from "path";

const SETTINGS_PATH = path.join(process.cwd(), ".claude", "settings.json");

// Remove the enforce-worktree PreToolUse entry from settings.json.
// Returns the original file content (for restoration) or null if not found / file absent.
export function suspendWorktreeHook(): string | null {
  if (!fs.existsSync(SETTINGS_PATH)) return null;

  let originalContent: string;
  try {
    originalContent = fs.readFileSync(SETTINGS_PATH, "utf-8");
  } catch {
    return null;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(originalContent);
  } catch {
    return null;
  }

  const preToolUse: unknown[] = parsed?.hooks?.PreToolUse;
  if (!Array.isArray(preToolUse)) return null;

  const idx = preToolUse.findIndex((entry: any) =>
    Array.isArray(entry?.hooks) &&
    entry.hooks.some(
      (h: any) => typeof h?.command === "string" && h.command.includes("enforce-worktree")
    )
  );
  if (idx === -1) return null;

  preToolUse.splice(idx, 1);

  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(parsed, null, 2) + "\n", "utf-8");
  } catch {
    return null;
  }

  return originalContent;
}

// Write back the original content verbatim. Called from a process.on("exit") handler.
export function restoreWorktreeHook(originalContent: string): void {
  try {
    fs.writeFileSync(SETTINGS_PATH, originalContent, "utf-8");
  } catch {
    // best effort — never throw from an exit handler
  }
}
