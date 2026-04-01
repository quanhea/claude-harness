#!/usr/bin/env node

/**
 * Export all conversation sessions for a project using the Claude Agent SDK.
 *
 * Uses the same session APIs as Claude Code's /export command:
 *   - listSessions() to find sessions for the current project
 *   - getSessionMessages() to load the full conversation chain
 *
 * Outputs one JSON file per session containing the complete message array
 * in the exact format returned by the SDK (same as Claude Code's internal
 * Message type). This preserves full fidelity — no lossy rendering.
 *
 * Usage:
 *   node export-conversations.mjs [output-dir] [max-sessions]
 *
 * Requires: @anthropic-ai/claude-agent-sdk (npm install)
 */

import { listSessions, getSessionMessages } from "@anthropic-ai/claude-agent-sdk";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const outputDir = process.argv[2] || join(process.cwd(), ".harness", "conversations");
  const maxSessions = parseInt(process.argv[3] || "50", 10);

  // List sessions for the current working directory
  const sessions = await listSessions({ limit: maxSessions });

  if (sessions.length === 0) {
    console.error("No sessions found for this project.");
    process.exit(0);
  }

  await mkdir(outputDir, { recursive: true });
  console.error(`Found ${sessions.length} sessions`);

  let exported = 0;

  for (const session of sessions) {
    try {
      const messages = await getSessionMessages(session.sessionId);
      if (!messages || messages.length === 0) continue;

      // Write full message array as JSON — exact SDK format, no lossy rendering
      const outPath = join(outputDir, `${session.sessionId}.json`);
      await writeFile(outPath, JSON.stringify({
        sessionId: session.sessionId,
        summary: session.summary || session.firstPrompt || "",
        cwd: session.cwd,
        createdAt: session.createdAt,
        lastModified: session.lastModified,
        messages,
      }, null, 2), "utf-8");

      exported++;

      const firstPrompt = (session.firstPrompt || session.summary || "").slice(0, 80);
      const userTurns = messages.filter(
        (m) => m.type === "user" && typeof m.message?.content === "string"
      ).length;
      console.error(`  ${session.sessionId}: ${userTurns} turns — "${firstPrompt}"`);
    } catch (err) {
      console.error(`  ${session.sessionId}: FAILED — ${err.message}`);
    }
  }

  console.error(`\nExported ${exported} sessions to ${outputDir}`);
  console.log(outputDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
