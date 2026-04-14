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
  maxTurns: number;
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
  maxTurns: number;
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

export interface TaskDefinition {
  id: string;          // semantic slug: "claude-md", "settings-json", ...
  promptFile: string;  // e.g. "claude-md.md"
  description: string;
}

export const DEFAULTS: HarnessConfig & { outputDir: string } = {
  parallel: 6,
  timeout: 1800,
  maxRetries: 2,
  maxTurns: 30,
  model: null,
  verbose: false,
  outputDir: ".claude-harness",
};

// Unordered task manifest — 28 tasks, all fully independent.
// Each prompt self-checks applicability and no-ops if not relevant.
export const TASK_MANIFEST: TaskDefinition[] = [
  { id: "claude-md",         promptFile: "claude-md.md",         description: "Generate CLAUDE.md (~100 lines, table of contents)" },
  { id: "settings-json",     promptFile: "settings-json.md",     description: "Generate .claude/settings.json with tool permissions" },
  { id: "architecture-md",   promptFile: "architecture-md.md",   description: "Generate ARCHITECTURE.md (matklad format)" },
  { id: "docs-structure",    promptFile: "docs-structure.md",    description: "Create docs/ directory skeleton" },
  { id: "git-workflow",      promptFile: "git-workflow.md",      description: "Generate docs/GIT_WORKFLOW.md (skips if no git history)" },
  { id: "infrastructure-md", promptFile: "infrastructure-md.md", description: "Generate docs/INFRASTRUCTURE.md" },
  { id: "quality-score",     promptFile: "quality-score.md",     description: "Generate docs/QUALITY_SCORE.md" },
  { id: "core-beliefs",      promptFile: "core-beliefs.md",      description: "Generate docs/design-docs/core-beliefs.md" },
  { id: "tech-debt-tracker", promptFile: "tech-debt-tracker.md", description: "Generate docs/exec-plans/tech-debt-tracker.md" },
  { id: "plans",             promptFile: "plans.md",             description: "Generate docs/PLANS.md" },
  { id: "product-sense",     promptFile: "product-sense.md",     description: "Generate docs/PRODUCT_SENSE.md" },
  { id: "reliability",       promptFile: "reliability.md",       description: "Generate docs/RELIABILITY.md" },
  { id: "security",          promptFile: "security.md",          description: "Generate docs/SECURITY.md" },
  { id: "design",            promptFile: "design.md",            description: "Generate docs/DESIGN.md (skips if not frontend)" },
  { id: "frontend",          promptFile: "frontend.md",          description: "Generate docs/FRONTEND.md (skips if not frontend)" },
  { id: "observability",     promptFile: "observability.md",     description: "Generate docs/OBSERVABILITY.md (skips if not an app)" },
  { id: "rule-architecture", promptFile: "rule-architecture.md", description: "Generate .claude/rules/architecture.md" },
  { id: "rule-testing",      promptFile: "rule-testing.md",      description: "Generate .claude/rules/testing.md" },
  { id: "rule-documentation",promptFile: "rule-documentation.md",description: "Generate .claude/rules/documentation.md" },
  { id: "rule-git",          promptFile: "rule-git.md",          description: "Generate .claude/rules/git-workflow.md" },
  { id: "skills",            promptFile: "skills.md",            description: "Generate project-specific skills from conversation history" },
  { id: "gardener",          promptFile: "gardener.md",          description: "Register project with the doc-gardening scheduler" },
  { id: "hooks",             promptFile: "hooks.md",             description: "Generate .claude/hooks/ custom linters" },
  { id: "formatter",         promptFile: "formatter.md",         description: "Generate formatter config (.prettierrc / ruff.toml / etc.)" },
  { id: "ci-workflow",       promptFile: "ci-workflow.md",       description: "Generate .github/workflows/harness-validate.yml" },
  { id: "arch-tests",        promptFile: "arch-tests.md",        description: "Generate architecture test file" },
  { id: "worktree",          promptFile: "worktree.md",          description: "Generate worktree isolation — post-checkout hook, docs/WORKTREE.md (most important feature)" },
  { id: "mcp-config",        promptFile: "mcp-config.md",        description: "Generate .mcp.json server recommendations" },
];
