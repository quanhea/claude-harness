---
description: Generate project-specific skills from conversation history
outputs: [".claude/skills/sync/SKILL.md",".claude/skills/review/SKILL.md"]
max-turns: null
---

# Task: Generate .claude/skills/ from conversation history

**Output:** `{{PROJECT_DIR}}/.claude/skills/<name>/SKILL.md` (1-N skills)

> `max-turns: null` (unlimited) — this prompt requires deep analysis: extract
> messages → cluster patterns → partial-Read many `.jsonl` files → classify
> SUCCESS/FAIL per conversation → extract working flows → synthesize skills.
> A turn cap will cut off the analysis mid-flight and produce wrong skills.

You are generating project-specific skills by analyzing the **actual Claude
Code conversation history** for this project, discovering recurring patterns
the user invokes manually, and writing each pattern as a `SKILL.md`.

The conversation history lives at `~/.claude/projects/<project-slug>/*.jsonl`
where `<project-slug>` is the project's absolute path with `/` replaced by `-`
(prefixed with `-`). For example, the project at `/Users/anhqtran/code/foo` has
its conversations at `~/.claude/projects/-Users-anhqtran-code-foo/`.

## Your Tasks

Create these tasks now with TaskCreate. Steps 5–8 are where the real work
happens — do not collapse them into one step.

1. "Detect project info (language, framework, commands)"
2. "Compute the project slug from {{PROJECT_DIR}} (replace / with -, prefix with -)"
3. "Write the embedded extraction script to .claude-harness/extract-conversations.cjs"
4. "Run the script: node .claude-harness/extract-conversations.cjs <slug> .claude-harness/conversations/"
5. "Cluster candidate patterns from the user-messages files (3+ conversations each)"
6. "For each candidate, partial-Read the source .jsonl files and classify each conversation as SUCCESS or FAIL"
7. "For each SUCCESS conversation, extract the working flow (assistant turns AFTER the last user pivot, UP TO the success signal)"
8. "Synthesize each skill's steps from the intersection of working flows; drop any candidate with fewer than 2 SUCCESS conversations"
9. "mkdir -p .claude/skills/sync .claude/skills/review .claude/skills/<each-surviving-pattern>"
10. "Write each SKILL.md (always sync + review; up to 3 surviving pattern-derived)"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Important: directory creation

`.claude/` is a protected path in Claude Code. Before any `Write` into
`.claude/skills/<name>/SKILL.md`, run a Bash `mkdir -p` for the subdirectory
first — this lands the write under the documented `.claude/skills/`
exemption. Do NOT rely on Write alone to create the parent directory.

## The extraction script (write this verbatim)

Use Write to put the following into `{{PROJECT_DIR}}/.claude-harness/extract-conversations.cjs`.
It's a Node.js port of the user's reference Python extractor — pure built-ins,
no npm install needed.

```javascript
#!/usr/bin/env node
// .claude-harness/extract-conversations.cjs
//
// Extract user messages from Claude Code conversation history (.jsonl files).
// Outputs markdown files with user messages grouped by conversation ID.
//
// Usage: node extract-conversations.cjs <project-slug> [output-dir]

const fs = require("fs");
const os = require("os");
const path = require("path");

const CHUNK_SIZE = 15;             // conversations per output file
const MAX_MSG_LEN = 500;           // truncate paste-dumps

function extract(projectSlug, outputDir) {
  const baseDir = path.join(os.homedir(), ".claude", "projects", projectSlug);
  if (!fs.existsSync(baseDir)) {
    console.error(`No conversation history at ${baseDir}`);
    process.exit(0); // soft exit — greenfield projects have no history
  }

  fs.mkdirSync(outputDir, { recursive: true });

  // Filter out files that look like agent/subagent logs
  const jsonlFiles = fs
    .readdirSync(baseDir)
    .filter((f) => f.endsWith(".jsonl"))
    .filter((f) => !f.toLowerCase().includes("agent"))
    .map((f) => path.join(baseDir, f))
    .sort();

  if (jsonlFiles.length === 0) {
    console.error(`No .jsonl files in ${baseDir}`);
    process.exit(0);
  }

  const conversations = [];

  for (const filepath of jsonlFiles) {
    const convId = path.basename(filepath).replace(".jsonl", "");
    const userMessages = [];
    const seen = new Set();

    let lines;
    try {
      lines = fs.readFileSync(filepath, "utf-8").split("\n");
    } catch (err) {
      console.error(`Skip ${filepath}: ${err.message}`);
      continue;
    }

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      let entry;
      try { entry = JSON.parse(line); } catch { continue; }

      // Two formats: top-level role/content, or nested message.{role,content}
      for (const candidate of [entry, entry.message]) {
        if (!candidate) continue;
        const role = candidate.role ?? entry.type;
        if (role !== "user" && role !== "human") continue;

        let content = candidate.content ?? "";
        if (Array.isArray(content)) {
          content = content
            .map((b) => {
              if (typeof b === "string") return b;
              if (b && b.type === "text") return b.text ?? "";
              return ""; // skip tool_result / tool_use blocks
            })
            .join("\n");
        }
        if (typeof content !== "string") continue;
        content = content.trim();
        if (!content) continue;
        if (content.startsWith("<system-reminder>")) continue;
        if (content.length > MAX_MSG_LEN) {
          content = content.slice(0, MAX_MSG_LEN) + "... [truncated]";
        }
        if (seen.has(content)) continue;
        seen.add(content);
        userMessages.push(content);
      }
    }

    if (userMessages.length > 0) {
      conversations.push({ convId, userMessages });
    }
  }

  // Write chunks of CHUNK_SIZE conversations per output file
  let fileIdx = 1;
  for (let i = 0; i < conversations.length; i += CHUNK_SIZE) {
    const chunk = conversations.slice(i, i + CHUNK_SIZE);
    const suffix = conversations.length > CHUNK_SIZE ? `-part${fileIdx}` : "";
    const outFile = path.join(outputDir, `${projectSlug}-user-messages${suffix}.md`);

    const lines = [`# User Messages from \`${projectSlug}\` (Part ${fileIdx})`, ""];
    for (const { convId, userMessages } of chunk) {
      lines.push(`### Conversation \`${convId}\`:`);
      userMessages.forEach((msg, idx) => {
        const escaped = msg.replace(/\n/g, "\n> ");
        lines.push(`**User message ${idx + 1}**: ${escaped}`);
        lines.push("");
      });
      lines.push("---", "");
    }
    fs.writeFileSync(outFile, lines.join("\n"));
    console.log(`Written: ${outFile} (${chunk.length} conversations)`);
    fileIdx++;
  }

  console.log(`\nTotal: ${conversations.length} conversations with user messages`);
}

const slug = process.argv[2];
const outDir = process.argv[3] || path.join(__dirname, "conversations");
if (!slug) {
  console.error("Usage: node extract-conversations.cjs <project-slug> [output-dir]");
  process.exit(1);
}
extract(slug, outDir);
```

## CRITICAL — Analyze conversations thoroughly BEFORE writing any skill

This is the most important part of this task. The naive approach (read user
messages, see "the user said X three times, write a skill that does X") will
**produce wrong skills** in almost every case, because conversations contain
many failed attempts before the successful one. A skill that encodes the
*first attempt* in a conversation is encoding what DIDN'T work.

**The skill must encode the LAST WORKING flow, not the first attempt.**

Real conversation lifecycle:
1. User asks for X.
2. Assistant tries approach A → wrong / partial / breaks tests.
3. User corrects: "no, the file is in src/auth not src/users", "actually use the existing helper", "you missed step Y".
4. Assistant tries approach B → still wrong.
5. User corrects again.
6. Assistant tries approach C → works.
7. User says "perfect" / "thanks" / pushes / no further messages.

If we extract approach A as the skill, the next agent invoking the skill
will repeat the same mistakes. Skills must extract approach C — the actual
working sequence of tool calls.

### Analysis pipeline (do this for every candidate pattern)

After the extraction script gives you the user-messages files, follow this
pipeline. Do NOT skip steps.

#### Step A — Cluster candidate patterns

Read every `.claude-harness/conversations/<slug>-user-messages-part*.md`
file. Group user messages into candidate patterns. A pattern qualifies as
a skill candidate only if it appears in **3 or more distinct conversations**.

For each candidate, record the list of conversation IDs where it appears.

Look for:
- **Repeated command sequences** — same multi-step operation 3+ times.
- **Common investigation patterns** — grep + read + correlate that recurs.
- **Review workflows** — pre-PR checks that happen repeatedly.
- **Deployment / release steps** — repeated sequences around shipping.
- **Recurring debug patterns** — same diagnosis flow for the same bug class.

#### Step B — For each candidate, classify each conversation as SUCCESS or FAIL

The user-messages files tell you WHICH conversations to look at. Now you
must read those conversations' raw `.jsonl` files to see the full flow.
The `.jsonl` files live at `~/.claude/projects/<project-slug>/<convId>.jsonl`.

**Use the Read tool with offset/limit to read .jsonl files partially.** Do
NOT load whole conversations into context — they can be huge. Strategy:

1. First, use Grep to locate the user message that introduces the pattern within the .jsonl: `grep -n '"text":"<user-prompt-snippet>"' <convId>.jsonl`. This gives you the line number.
2. Read 50–200 lines starting from that line to see the assistant's first attempt.
3. Read the LAST 200 lines of the .jsonl to see how the conversation ended.
4. Read intermediate sections only if you need to disambiguate.

Classify each conversation against the pattern as one of:

- **SUCCESS** — the assistant ultimately produced a working solution AND the user signaled acceptance. Signals:
  - The last user message is positive / closing: "perfect", "thanks", "done", "ship it", "looks good", "great", a `/commit`, a `git push`, OR no further user message at all (the user moved on satisfied).
  - The last assistant message reports completion with verifiable outcomes ("tests pass", "deployed", "PR opened").
  - Tool calls toward the end succeeded (no terminal errors that went unaddressed).
- **FAIL** — the conversation never reached a working state for this pattern. Signals:
  - The last user message is corrective / unhappy: "still broken", "no, that's wrong", "you missed", "try again", "actually...".
  - The conversation was abandoned mid-flow (no closure).
  - Many revert / undo operations near the end.

#### Step C — For each SUCCESS conversation, extract the WORKING flow

Read the .jsonl section between the LAST user pivot/correction and the
final success signal. That window contains the actual working flow.

Heuristic for "last pivot":
- Walk user messages backwards from the success signal until you find one
  that is NOT positive/closing — that's the pivot.
- The assistant turns AFTER the pivot, UP TO the success signal, are the
  working flow.

From those assistant turns, extract:
- The exact tool calls in order: `Bash(npm test)`, `Read(src/auth.ts)`, `Edit(...)` etc.
- The decisions / strategies the assistant articulated.
- The verification steps the assistant ran at the end.

Discard everything before the last pivot — it's the failed-attempt history.

#### Step D — Synthesize the skill from the unioned working flows

For a candidate that has, say, 4 SUCCESS conversations, you now have 4
working flows. They will not be identical (different files touched,
different specifics) but should share a CORE SEQUENCE of steps.

Synthesize:
- The **steps** in the SKILL.md should be the intersection / common core, not the union.
- The **example invocations** can vary across conversations.
- If two conversations diverge significantly in approach, that's a sign you have TWO skills, not one — split them.
- Each step in the skill should reference a real command the assistant actually ran in a SUCCESS conversation. Do not invent generic-sounding steps.

If a candidate has fewer than 2 SUCCESS conversations (regardless of total
occurrences), DROP IT. The pattern repeats, but no working flow has been
demonstrated enough to encode reliably.

#### Step E — Sanity-check the skill before writing

Before Writing the SKILL.md, ask yourself for each step:
- Was this step in the working window of at least 2 SUCCESS conversations?
- If a future agent runs this step, what's the failure mode? Does the skill warn about it (because the original conversations hit and corrected that failure)?
- Does the skill capture the LAST working version, not an interim attempt?

If the answer is "no" or "I'm not sure" for any step, go back and re-read
the relevant .jsonl section. The skill is only as good as the analysis.

### Greenfield case

If the script reported "No conversation history" or "No .jsonl files", or
if NO candidate pattern has 2+ SUCCESS conversations, treat this project as
greenfield. ONLY generate the always-included `sync` and `review` skills
below — do not invent pattern-derived skills with no evidence.

## Always-Generated Skills

Generate these regardless of conversation history. Adapt commands and tools
to the detected project.

### sync — `.claude/skills/sync/SKILL.md`

```markdown
---
name: sync
description: Re-analyze the project and update documentation to match current code. Use when docs may be stale or after significant code changes.
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
---

# sync

Re-reads the codebase and updates stale documentation to reflect current reality.

## Steps

1. Read current `ARCHITECTURE.md` and `docs/QUALITY_SCORE.md`.
2. For each section in `ARCHITECTURE.md`, verify referenced files / types still exist and match the description.
3. Edit divergent sections in place. Add new modules; remove deleted ones.
4. Re-score each domain in `docs/QUALITY_SCORE.md` against current evidence; append a row to the History table.
5. Run `<lint command for this project>`; fold new findings into the Linting score.
6. Report what changed: docs updated, scores moved, divergence found but not yet fixed.

## Context

- @ARCHITECTURE.md
- @docs/QUALITY_SCORE.md
- @docs/RELIABILITY.md
- @docs/OBSERVABILITY.md (if present)
```

### review — `.claude/skills/review/SKILL.md`

```markdown
---
name: review
description: Architecture-aware code review for current changes. Use before committing or opening a PR.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: [file or branch to review]
---

# review

Reviews uncommitted changes (or a specified file/branch) against this repo's
architectural invariants and conventions.

## Steps

1. Run `git diff` (or against the argument) to see the changes.
2. Run `<lint command>` and `<test command>`.
3. For each touched module, check the rules in `.claude/rules/architecture.md` (dependency direction, layer boundaries, naming).
4. Flag security concerns from `docs/SECURITY.md` (secrets, auth, boundary validation).
5. Group findings by severity: `must-fix`, `should-fix`, `nit`. Report each with file:line.

## Context

- @ARCHITECTURE.md
- @.claude/rules/architecture.md
- @docs/SECURITY.md
```

## Pattern-Derived Skills (up to 3)

A pattern qualifies for a skill ONLY if it has both:
- 3+ distinct conversations where the user invoked it (Step A above), AND
- 2+ of those conversations classified as SUCCESS (Step B above).

For each surviving pattern, create `.claude/skills/<short-slug>/SKILL.md`:

```yaml
---
name: <short-slug>
description: <one-line — when to use it (drawn from how the SUCCESS conversations actually used it)>
allowed-tools: <minimal tool list — only the tools the SUCCESS flows actually used>
argument-hint: <optional, only if SUCCESS conversations consistently took an argument>
---
```

Body sections:
- **One-paragraph "what this does"** — the actual outcome the SUCCESS conversations achieved. Reference the file types or system being touched. NOT generic advice.
- **Steps** — numbered, derived from the intersection of working flows (Step D). Each step should be a real command or operation the assistant ran in the SUCCESS turns. Format: `1. Run \`<exact command>\`` or `1. Read @<file> to understand <what>`.
- **Pitfalls (optional but recommended)** — if the SUCCESS conversations had to correct the assistant's first attempt with a specific gotcha ("the file lives in src/auth, not src/users"; "use the existing helper, don't add a dependency"), encode that as a pitfall the new skill warns about up-front.
- **Context** — list of `@<file>` references the SUCCESS conversations consistently consulted before acting.

Maximum 3 pattern-derived skills. If more patterns survive Step D, pick the
3 with the most SUCCESS conversations. Folder names: lowercase + hyphens, no
spaces.

## Update CLAUDE.md

After generating skills, update the Skills table in `CLAUDE.md`. Replace the
placeholder `/skill-name` row with one row per generated skill:

```markdown
| `/sync` | Re-analyze the project and update stale docs |
| `/review` | Architecture-aware review of current changes |
| `/<pattern-name>` | <one-line — when to use it> |
```

If CLAUDE.md doesn't exist yet (running this task in isolation before
`claude-md`), skip the CLAUDE.md update — the next full run will pick it up.

## Rules

- DO mkdir -p .claude/skills/<name>/ via Bash before any Write into that path.
- DO NOT create skills for patterns seen only once or twice.
- DO NOT create skills that duplicate Claude's built-in capabilities trivially.
- DO NOT overwrite existing skills — read `.claude/skills/` first; only ADD missing.
- The extraction script writes to `.claude-harness/conversations/`, not into the project's `docs/` or `.claude/`. Don't move it.
- Total skill count: 2 (always) + up to 3 (pattern-derived) = 5 max.
