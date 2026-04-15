---
description: Generate project-specific skills from conversation history
outputs: [".claude/skills/*/SKILL.md"]
max-turns: null
---

# Task: Generate `.claude/skills/` from conversation history

**Output:** `{{PROJECT_DIR}}/.claude/skills/<name>/SKILL.md` (one directory per discovered skill)

You are generating project-specific skills by analyzing the **actual Claude
Code conversation history** for this project, discovering recurring patterns
the user invokes manually, and writing each pattern as a `SKILL.md`.

The conversation history lives at `~/.claude/projects/<project-slug>/*.jsonl`
where `<project-slug>` is the project's absolute path with `/` replaced by `-`
(prefixed with `-`). For example, the project at `/Users/anhqtran/code/foo`
has its conversations at `~/.claude/projects/-Users-anhqtran-code-foo/`.

**Important:** there is no always-generated set. Skills come from evidence
in the conversation history. If no pattern qualifies, generate zero skills —
do not invent placeholder skills.

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
9. "mkdir -p .claude/skills/<each-surviving-skill-name>/ via Bash"
10. "Write each SKILL.md following the official Claude Code skills format (see Reference Skill Formats below)"
11. "Update CLAUDE.md Skills table with the actual skills generated"

Use TaskUpdate to mark each complete. Use TaskList before finishing.

## Important: directory creation

`.claude/` is a protected path in Claude Code. Before any `Write` into
`.claude/skills/<name>/SKILL.md`, run a Bash `mkdir -p` for the
subdirectory first — this lands the write under the documented
`.claude/skills/` exemption. Do NOT rely on Write alone to create the parent
directory.

## The extraction script (write this verbatim)

Use Write to put the following into `{{PROJECT_DIR}}/.claude-harness/extract-conversations.cjs`.
It's a Node.js port of the harness's reference Python extractor — pure
built-ins, no npm install needed.

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
if NO candidate pattern survives Step D, generate ZERO skills. The
`.claude/skills/` directory does not need to exist. Do not invent
placeholder skills — that's exactly the bloat the harness aims to avoid.

## Reference Skill Formats (from the official Claude Code docs)

Match one of these formats based on the type of pattern you discovered.
Reference: <https://code.claude.com/docs/en/skills>

### Format 1 — Reference content

For patterns that are essentially **knowledge** the user kept restating:
conventions, style guides, domain terminology. Lets Claude apply the
guidance in any conversation it deems relevant.

```yaml
---
name: api-conventions
description: API design patterns for this codebase
---

When writing API endpoints:
- Use RESTful naming conventions
- Return consistent error formats
- Include request validation
```

### Format 2 — Task content with disabled auto-invocation

For patterns that are **actions with side effects**: deploys, commits,
sends. The user wants to invoke explicitly via `/skill-name` and does NOT
want Claude triggering them automatically.

```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
allowed-tools: Bash(git push *) Bash(npm run deploy *)
---

Deploy $ARGUMENTS to production:

1. Run the test suite
2. Build the application
3. Push to the deployment target
4. Verify the deployment succeeded
```

### Format 3 — Task with arguments (positional)

For patterns where the user consistently passed an argument (issue number,
file name, branch). Use `$ARGUMENTS` for the full input or `$0`, `$1`, …
for positional access.

```yaml
---
name: fix-issue
description: Fix a GitHub issue
disable-model-invocation: true
---

Fix GitHub issue $ARGUMENTS following our coding standards.

1. Read the issue description
2. Understand the requirements
3. Implement the fix
4. Write tests
5. Create a commit
```

### Format 4 — Forked subagent (long-running analysis)

For patterns that fan out into a deep read-only analysis (research,
investigation, summarization). Runs in an isolated context using a
subagent type — keeps the main conversation clean.

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:

1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

### Format 5 — Inline shell injection

For patterns that always need fresh data captured at invocation time
(current PR state, git status, env). Use `` !`<command>` `` to inline
command output before Claude sees the prompt.

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

### Frontmatter quick reference

| Field | Use it when |
|-------|-------------|
| `name` | Optional — defaults to the directory name. |
| `description` | Always include. Front-load the trigger phrase the user actually said. |
| `disable-model-invocation: true` | The skill has side effects. User triggers explicitly with `/name`. |
| `user-invocable: false` | Background knowledge. Claude reads, but `/name` shouldn't appear in autocomplete. |
| `allowed-tools: <list>` | Pre-approve specific tools so the skill can run without permission prompts. Space-separated. |
| `context: fork` + `agent: Explore` | Skill should run in an isolated subagent (read-only deep dive). |
| `argument-hint: "[file] [branch]"` | Helps autocomplete when the skill takes arguments. |

## Update CLAUDE.md

After generating skills, update the Skills table in `CLAUDE.md`. Replace
the placeholder `/skill-name` row with one row per generated skill:

```markdown
| `/<actual-skill-name>` | <description from the skill's frontmatter> |
```

If CLAUDE.md doesn't exist yet (running this task in isolation before
`claude-md`), skip the CLAUDE.md update — the next full run will pick it up.
If you generated zero skills, leave the placeholder row as-is.

## Rules

- DO `mkdir -p .claude/skills/<name>/` via Bash before any Write into that path.
- DO NOT generate any skill that doesn't have 2+ SUCCESS conversations behind it.
- DO NOT invent skills to fill empty space — zero is the correct count for greenfield projects.
- DO NOT overwrite existing skills — read `.claude/skills/` first; only ADD missing.
- The extraction script writes to `.claude-harness/conversations/`, not into the project's `docs/` or `.claude/`.
- Skill folder names use lowercase + hyphens, no spaces.
- Skill `description` text should match phrasing the user actually used — that's what makes Claude pick the skill in future sessions.
