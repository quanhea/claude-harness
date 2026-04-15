// src/types.ts — shared constants, enums, and type definitions

export const STATUS = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  TIMEOUT: "TIMEOUT",
  INTERRUPTED: "INTERRUPTED",
  SKIPPED: "SKIPPED",
} as const;

export type TaskStatus = (typeof STATUS)[keyof typeof STATUS];

export const STATE_VERSION = 2;

export interface TaskEntry {
  status: TaskStatus;
  attempts: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  exitCode?: number | null;
  lastError?: string;
}

export interface HarnessStats {
  totalTasks: number;
  completed: number;
  failed: number;
  timeout: number;
  skipped: number;
  pending: number;
  running: number;
}

export interface HarnessConfig {
  parallel: number;
  timeout: number;
  maxRetries: number;
  // null or <= 0 means "no --max-turns flag passed" → Claude runs until it
  // finishes on its own, only bounded by `timeout`. Per-prompt overrides via
  // YAML frontmatter (max-turns: null, max-turns: 200) are merged on top.
  maxTurns: number | null;
  model: string | null;
  verbose: boolean;
}

export interface HarnessState {
  version: number;
  runId: string;
  targetDir: string;
  startedAt: string;
  config: HarnessConfig;
  stats: HarnessStats;
  tasks: Record<string, TaskEntry>;
}

export interface WorkerResult {
  taskId: string;
  status: TaskStatus;
  exitCode: number | null;
  durationMs: number;
  error?: string;
  retryAfterMs?: number;
}

export interface HarnessOptions {
  targetDir: string;
  // The raw target arg the user typed on the CLI, or null if they omitted it.
  // Used to echo a resume/retry suggestion that matches the original invocation.
  targetArg?: string | null;
  outputDir: string;
  parallel: number;
  timeout: number;
  maxRetries: number;
  maxTurns: number | null;  // null = no --max-turns flag (Claude runs to completion)
  model: string | null;
  only: string[] | null;
  resume: boolean;
  retry: boolean;
  dryRun: boolean;
  force: boolean;
  verbose: boolean;
}

export interface GardenerProject {
  path: string;
  schedule: string;
  lastRunAt: string | null;
  lastWorktreeCommit: string | null;
}

export interface GardenerRegistry {
  projects: GardenerProject[];
}

// Slim manifest entry: just the registry of "this is a runnable task and
// here's its prompt file". All other metadata (description, outputs,
// max-turns) lives in the prompt's YAML frontmatter — see src/prompt.ts.
// This keeps each prompt fully self-describing and the manifest stable.
export interface TaskDefinition {
  id: string;          // semantic slug: "claude-md", "settings-json", ...
  promptFile: string;  // e.g. "claude-md.md"
}

export const DEFAULTS: HarnessConfig & { outputDir: string } = {
  parallel: 12,
  timeout: 1800,
  maxRetries: 2,
  maxTurns: 100,
  model: null,
  verbose: false,
  outputDir: ".claude-harness",
};

// Unordered task manifest — 28 tasks, all fully independent. Just the
// registry of (id, promptFile). Per-task description, outputs, and
// max-turns live in each prompt's YAML frontmatter. Each prompt
// self-checks applicability and no-ops if not relevant.
export const TASK_MANIFEST: TaskDefinition[] = [
  { id: "claude-md",          promptFile: "claude-md.md" },
  { id: "settings-json",      promptFile: "settings-json.md" },
  { id: "architecture-md",    promptFile: "architecture-md.md" },
  { id: "docs-structure",     promptFile: "docs-structure.md" },
  { id: "git-workflow",       promptFile: "git-workflow.md" },
  { id: "infrastructure-md",  promptFile: "infrastructure-md.md" },
  { id: "quality-score",      promptFile: "quality-score.md" },
  { id: "core-beliefs",       promptFile: "core-beliefs.md" },
  { id: "tech-debt-tracker",  promptFile: "tech-debt-tracker.md" },
  { id: "plans",              promptFile: "plans.md" },
  { id: "product-sense",      promptFile: "product-sense.md" },
  { id: "reliability",        promptFile: "reliability.md" },
  { id: "security",           promptFile: "security.md" },
  { id: "design",             promptFile: "design.md" },
  { id: "frontend",           promptFile: "frontend.md" },
  { id: "observability",      promptFile: "observability.md" },
  { id: "rule-architecture",  promptFile: "rule-architecture.md" },
  { id: "rule-testing",       promptFile: "rule-testing.md" },
  { id: "rule-documentation", promptFile: "rule-documentation.md" },
  { id: "rule-git",           promptFile: "rule-git.md" },
  { id: "skills",             promptFile: "skills.md" },
  { id: "gardener",           promptFile: "gardener.md" },
  { id: "hooks",              promptFile: "hooks.md" },
  { id: "formatter",          promptFile: "formatter.md" },
  { id: "ci-workflow",        promptFile: "ci-workflow.md" },
  { id: "arch-tests",         promptFile: "arch-tests.md" },
  { id: "worktree",           promptFile: "worktree.md" },
  { id: "mcp-config",         promptFile: "mcp-config.md" },
];
