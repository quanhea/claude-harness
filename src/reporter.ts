// src/reporter.ts — generate setup-report.md from task run results
import * as fs from "fs";
import * as path from "path";
import { HarnessState, STATUS } from "./types";
import { formatDuration } from "./progress";

// Optional task-id → description lookup. Descriptions now live in each
// prompt's YAML frontmatter (loaded by the scanner), so the reporter takes
// them as input rather than reading prompt files itself.
export type DescriptionLookup = (taskId: string) => string;

export function generateReport(
  state: HarnessState,
  describe: DescriptionLookup = (id) => id,
): string {
  const lines: string[] = [];

  lines.push("# claude-harness Setup Report");
  lines.push("");
  lines.push(`**Target:** ${state.targetDir}`);
  lines.push(`**Run ID:** ${state.runId}`);
  lines.push(`**Started:** ${state.startedAt}`);
  lines.push(`**Completed:** ${new Date().toISOString()}`);
  lines.push("");

  lines.push("## Stats");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total tasks | ${state.stats.totalTasks} |`);
  lines.push(`| Completed   | ${state.stats.completed} |`);
  lines.push(`| Failed      | ${state.stats.failed} |`);
  lines.push(`| Timeout     | ${state.stats.timeout} |`);
  lines.push(`| Skipped     | ${state.stats.skipped} |`);
  lines.push("");

  // Completed tasks with descriptions
  const completed = Object.entries(state.tasks)
    .filter(([, e]) => e.status === STATUS.COMPLETED)
    .sort(([a], [b]) => a.localeCompare(b));

  if (completed.length > 0) {
    lines.push("## Completed Tasks");
    lines.push("");
    for (const [taskId, entry] of completed) {
      const dur = entry.durationMs ? ` (${formatDuration(entry.durationMs)})` : "";
      lines.push(`- **[${taskId}]** ${describe(taskId)}${dur}`);
    }
    lines.push("");
  }

  // Failed / timed out tasks
  const failed = Object.entries(state.tasks)
    .filter(([, e]) => e.status === STATUS.FAILED || e.status === STATUS.TIMEOUT)
    .sort(([a], [b]) => a.localeCompare(b));

  if (failed.length > 0) {
    lines.push("## Failed / Timed Out Tasks");
    lines.push("");
    for (const [taskId, entry] of failed) {
      lines.push(`- **[${taskId}]** ${describe(taskId)} — ${entry.status}${entry.lastError ? ` (${entry.lastError})` : ""}`);
    }
    lines.push("");
    lines.push("Retry with: `claude-harness --retry`");
    lines.push("");
  }

  return lines.join("\n");
}

export function writeReport(
  outputDir: string,
  state: HarnessState,
  describe?: DescriptionLookup,
): string {
  const reportPath = path.join(outputDir, "setup-report.md");
  fs.writeFileSync(reportPath, generateReport(state, describe));
  return reportPath;
}
