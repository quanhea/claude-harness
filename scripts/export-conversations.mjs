#!/usr/bin/env node

/**
 * Export all conversation sessions for a project as plain text.
 *
 * Follows the same JSONL format and conversation chain logic as Claude Code's
 * /export command (src/commands/export/export.tsx + src/utils/sessionStorage.ts).
 *
 * Usage:
 *   node export-conversations.mjs <project-path> [output-dir]
 *
 * Reads:  ~/.claude/projects/<sanitized-path>/*.jsonl
 * Writes: <output-dir>/session-<id>.txt (one file per session)
 *
 * Each output file contains the full conversation in plain text:
 *   ❯ <user prompt>
 *   ⏺ <assistant response>
 *   ⏺ [tool_use: Read] /path/to/file
 *   ...
 */

import { readFile, readdir, writeFile, mkdir, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

// ---------------------------------------------------------------------------
// Path sanitization — matches Claude Code's sanitizePath exactly
// (src/utils/sessionStoragePortable.ts)
// ---------------------------------------------------------------------------

const MAX_SANITIZED_LENGTH = 200;

function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function sanitizePath(name) {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, "-");
  if (sanitized.length <= MAX_SANITIZED_LENGTH) {
    return sanitized;
  }
  const hash = Math.abs(djb2Hash(name)).toString(36);
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${hash}`;
}

// ---------------------------------------------------------------------------
// JSONL parsing
// ---------------------------------------------------------------------------

function parseJSONL(content) {
  const entries = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Transcript message filtering — matches isTranscriptMessage
// (src/utils/sessionStorage.ts)
// ---------------------------------------------------------------------------

const TRANSCRIPT_TYPES = new Set(["user", "assistant", "system", "attachment"]);

function isTranscriptMessage(entry) {
  return TRANSCRIPT_TYPES.has(entry.type) && entry.uuid != null;
}

// ---------------------------------------------------------------------------
// Build conversation chain — matches buildConversationChain
// (src/utils/sessionStorage.ts:2069)
// ---------------------------------------------------------------------------

function buildConversationChain(messagesMap, leafMessage) {
  const chain = [];
  const seen = new Set();
  let current = leafMessage;

  while (current) {
    if (seen.has(current.uuid)) break;
    seen.add(current.uuid);
    chain.push(current);
    current = current.parentUuid
      ? messagesMap.get(current.parentUuid)
      : undefined;
  }

  chain.reverse();

  // Recover orphaned parallel tool results (simplified version)
  // Group assistant messages by message.id, find siblings not in chain
  const chainUuids = new Set(chain.map((m) => m.uuid));
  const siblingsByMsgId = new Map();
  const toolResultsByParent = new Map();

  for (const m of messagesMap.values()) {
    if (m.type === "assistant" && m.message?.id) {
      const group = siblingsByMsgId.get(m.message.id) || [];
      group.push(m);
      siblingsByMsgId.set(m.message.id, group);
    }
    if (
      m.type === "user" &&
      m.parentUuid &&
      Array.isArray(m.message?.content) &&
      m.message.content.some((b) => b.type === "tool_result")
    ) {
      const group = toolResultsByParent.get(m.parentUuid) || [];
      group.push(m);
      toolResultsByParent.set(m.parentUuid, group);
    }
  }

  // Find orphaned siblings and their tool results
  const inserts = new Map();
  const processedGroups = new Set();

  for (const m of chain) {
    if (m.type !== "assistant" || !m.message?.id) continue;
    const msgId = m.message.id;
    if (processedGroups.has(msgId)) continue;
    processedGroups.add(msgId);

    const group = siblingsByMsgId.get(msgId) || [];
    const orphanedSiblings = group.filter((s) => !chainUuids.has(s.uuid));
    const orphanedTRs = [];
    for (const member of group) {
      const trs = toolResultsByParent.get(member.uuid) || [];
      for (const tr of trs) {
        if (!chainUuids.has(tr.uuid)) orphanedTRs.push(tr);
      }
    }

    if (orphanedSiblings.length === 0 && orphanedTRs.length === 0) continue;

    orphanedSiblings.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    orphanedTRs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const recovered = [...orphanedSiblings, ...orphanedTRs];
    for (const r of recovered) chainUuids.add(r.uuid);
    inserts.set(m.uuid, recovered);
  }

  if (inserts.size === 0) return chain;

  const result = [];
  for (const m of chain) {
    result.push(m);
    const toInsert = inserts.get(m.uuid);
    if (toInsert) result.push(...toInsert);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Load a JSONL session file and build the conversation chain
// ---------------------------------------------------------------------------

function loadSession(content) {
  const entries = parseJSONL(content);
  const messages = new Map();
  const metadata = { title: null, tag: null };

  for (const entry of entries) {
    if (isTranscriptMessage(entry)) {
      messages.set(entry.uuid, entry);
    } else if (entry.type === "custom-title") {
      metadata.title = entry.customTitle;
    } else if (entry.type === "ai-title") {
      if (!metadata.title) metadata.title = entry.aiTitle;
    } else if (entry.type === "tag") {
      metadata.tag = entry.tag;
    }
  }

  if (messages.size === 0) return null;

  // Find the leaf: latest message not referenced as parentUuid by another
  const referenced = new Set();
  for (const m of messages.values()) {
    if (m.parentUuid) referenced.add(m.parentUuid);
  }

  let leaf = null;
  for (const m of messages.values()) {
    if (!referenced.has(m.uuid)) {
      if (!leaf || m.timestamp > leaf.timestamp) {
        leaf = m;
      }
    }
  }

  // Fallback: just use the latest message
  if (!leaf) {
    leaf = [...messages.values()].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    )[0];
  }

  if (!leaf) return null;

  const chain = buildConversationChain(messages, leaf);
  return { chain, metadata };
}

// ---------------------------------------------------------------------------
// Render a conversation chain to plain text — matches /export output format
// ---------------------------------------------------------------------------

function renderChainToPlainText(chain, metadata) {
  const lines = [];

  if (metadata?.title) {
    lines.push(`# ${metadata.title}`);
    lines.push("");
  }

  for (const msg of chain) {
    if (msg.isSidechain) continue;

    if (msg.type === "user") {
      const text = extractUserText(msg);
      if (text) {
        lines.push(`❯ ${text}`);
        lines.push("");
      }
    } else if (msg.type === "assistant") {
      const content = msg.message?.content;
      if (!Array.isArray(content)) continue;

      for (const block of content) {
        if (block.type === "text" && block.text?.trim()) {
          lines.push(`⏺ ${block.text.trim()}`);
          lines.push("");
        } else if (block.type === "tool_use") {
          const inputSummary = renderToolInput(block.name, block.input);
          lines.push(`⏺ [${block.name}] ${inputSummary}`);
        } else if (block.type === "thinking") {
          // Skip thinking blocks in export (same as /export)
        }
      }
      lines.push("");
    } else if (msg.type === "system" && msg.subtype === "turn_duration") {
      // Skip system messages
    }
  }

  return lines.join("\n");
}

function extractUserText(msg) {
  const content = msg.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    const texts = content
      .filter((b) => b.type === "text")
      .map((b) => b.text?.trim())
      .filter(Boolean);
    if (texts.length > 0) return texts.join("\n");

    // Tool results — render them
    const results = content.filter((b) => b.type === "tool_result");
    if (results.length > 0) return null; // Skip tool_result-only messages
  }
  return null;
}

function renderToolInput(tool, input) {
  if (!input) return "";
  switch (tool) {
    case "Read":
      return input.file_path || "";
    case "Write":
      return `${input.file_path || ""} (${(input.content || "").length} chars)`;
    case "Edit":
      return `${input.file_path || ""} — replace "${(input.old_string || "").slice(0, 60)}..."`;
    case "Bash":
      return input.command || "";
    case "Glob":
      return `pattern: ${input.pattern || ""} ${input.path ? `in ${input.path}` : ""}`;
    case "Grep":
      return `/${input.pattern || ""}/ ${input.path ? `in ${input.path}` : ""}`;
    case "Agent":
      return `(${input.description || ""}) ${(input.prompt || "").slice(0, 100)}...`;
    case "TaskCreate":
      return input.subject || "";
    case "TaskUpdate":
      return `#${input.taskId} → ${input.status || ""}`;
    default:
      // MCP tools and others — show first few input keys
      const keys = Object.keys(input).slice(0, 3);
      return keys.map((k) => `${k}: ${String(input[k]).slice(0, 60)}`).join(", ");
  }
}

// ---------------------------------------------------------------------------
// Find session files for a project
// ---------------------------------------------------------------------------

async function findSessionFiles(projectPath, maxSessions = 50) {
  const sanitized = sanitizePath(projectPath);
  const projectsDir = join(homedir(), ".claude", "projects");
  const projectDir = join(projectsDir, sanitized);

  if (!existsSync(projectDir)) {
    // Try prefix match for long paths with hash mismatch
    if (sanitized.length > MAX_SANITIZED_LENGTH) {
      const prefix = sanitized.slice(0, MAX_SANITIZED_LENGTH);
      try {
        const entries = await readdir(projectsDir, { withFileTypes: true });
        const match = entries.find(
          (d) => d.isDirectory() && d.name.startsWith(prefix + "-")
        );
        if (match) {
          return findJsonlFiles(join(projectsDir, match.name), maxSessions);
        }
      } catch {
        return [];
      }
    }
    return [];
  }

  return findJsonlFiles(projectDir, maxSessions);
}

async function findJsonlFiles(dir, maxSessions) {
  const entries = await readdir(dir);
  const jsonlFiles = entries.filter((f) => f.endsWith(".jsonl"));

  // Sort by modification time, newest first
  const withStats = await Promise.all(
    jsonlFiles.map(async (f) => {
      const path = join(dir, f);
      try {
        const s = await stat(path);
        return { path, mtime: s.mtimeMs, size: s.size };
      } catch {
        return null;
      }
    })
  );

  return withStats
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, maxSessions)
    .map((f) => f.path);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const projectPath = process.argv[2];
  const outputDir = process.argv[3] || join(process.cwd(), ".harness", "conversations");

  if (!projectPath) {
    console.error(
      "Usage: node export-conversations.mjs <project-path> [output-dir]"
    );
    process.exit(1);
  }

  const files = await findSessionFiles(projectPath);
  if (files.length === 0) {
    console.error(`No sessions found for: ${projectPath}`);
    console.error(`Looked in: ~/.claude/projects/${sanitizePath(projectPath)}/`);
    process.exit(0);
  }

  await mkdir(outputDir, { recursive: true });

  console.error(`Found ${files.length} sessions`);

  let exported = 0;
  for (const filepath of files) {
    const content = await readFile(filepath, "utf-8");
    const session = loadSession(content);
    if (!session || session.chain.length === 0) continue;

    const text = renderChainToPlainText(session.chain, session.metadata);
    if (!text.trim()) continue;

    const sessionId = basename(filepath, ".jsonl");
    const outPath = join(outputDir, `session-${sessionId}.txt`);
    await writeFile(outPath, text, "utf-8");
    exported++;

    // Also print session summary to stderr
    const firstPrompt = session.chain.find((m) => m.type === "user");
    const promptPreview = extractUserText(firstPrompt)?.slice(0, 80) || "(empty)";
    const turnCount = session.chain.filter(
      (m) => m.type === "user" && extractUserText(m)
    ).length;
    console.error(
      `  ${sessionId}: ${turnCount} turns — "${promptPreview}"`
    );
  }

  console.error(`\nExported ${exported} sessions to ${outputDir}`);

  // Print the output directory path to stdout (for the skill to use)
  console.log(outputDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
