import type { SessionData } from './sessions.js'

export interface Pattern {
  name: string
  description: string
  frequency: number
  /** Commands or workflows this pattern represents */
  steps: string[]
  /** File patterns this touches */
  filePatterns: string[]
  /** Example prompts that triggered this pattern */
  examplePrompts: string[]
}

/**
 * Extract recurring patterns from conversation sessions.
 * Looks for repeated workflows, common commands, and file groupings.
 */
export function extractPatterns(sessions: SessionData[]): Pattern[] {
  const commandCounts = new Map<string, number>()
  const workflowCounts = new Map<string, { count: number; prompts: string[] }>()
  const fileGroupCounts = new Map<string, { count: number; files: Set<string> }>()

  for (const session of sessions) {
    const userPrompts = session.messages.filter(m => m.role === 'user').map(m => m.content)
    const toolMessages = session.messages.filter(m => m.role === 'assistant' && m.toolUses)

    // Track bash commands
    for (const msg of toolMessages) {
      for (const tool of msg.toolUses || []) {
        if (tool.tool === 'Bash' && typeof tool.input.command === 'string') {
          const cmd = normalizeCommand(tool.input.command)
          commandCounts.set(cmd, (commandCounts.get(cmd) || 0) + 1)
        }
      }
    }

    // Track workflow patterns from user prompts
    for (const prompt of userPrompts) {
      const workflow = classifyWorkflow(prompt)
      if (workflow) {
        const existing = workflowCounts.get(workflow) || { count: 0, prompts: [] }
        existing.count++
        if (existing.prompts.length < 3) {
          existing.prompts.push(prompt.slice(0, 200))
        }
        workflowCounts.set(workflow, existing)
      }
    }

    // Track file groups from tool uses
    const filesInSession = new Set<string>()
    for (const msg of toolMessages) {
      for (const tool of msg.toolUses || []) {
        const filePath = extractFilePath(tool)
        if (filePath) {
          filesInSession.add(filePath)
        }
      }
    }

    if (filesInSession.size > 0) {
      const group = getFileGroup(filesInSession)
      if (group) {
        const existing = fileGroupCounts.get(group) || { count: 0, files: new Set() }
        existing.count++
        for (const f of filesInSession) existing.files.add(f)
        fileGroupCounts.set(group, existing)
      }
    }
  }

  const patterns: Pattern[] = []

  // Convert frequent workflows into patterns
  for (const [workflow, data] of workflowCounts) {
    if (data.count >= 2) {
      patterns.push({
        name: workflow,
        description: `Recurring workflow: ${workflow}`,
        frequency: data.count,
        steps: getWorkflowSteps(workflow),
        filePatterns: [],
        examplePrompts: data.prompts,
      })
    }
  }

  // Convert frequent commands into patterns
  for (const [cmd, count] of commandCounts) {
    if (count >= 3) {
      patterns.push({
        name: `run-${cmd.split(' ')[0]}`,
        description: `Frequently used command: ${cmd}`,
        frequency: count,
        steps: [cmd],
        filePatterns: [],
        examplePrompts: [],
      })
    }
  }

  // Sort by frequency
  patterns.sort((a, b) => b.frequency - a.frequency)

  return patterns.slice(0, 10) // Top 10 patterns
}

function normalizeCommand(cmd: string): string {
  // Strip variable parts like specific file paths, keeping the command shape
  return cmd
    .replace(/\/[\w/.-]+\.(ts|js|py|go|rs|rb)/g, '<file>')
    .replace(/["'][^"']+["']/g, '<arg>')
    .trim()
}

const WORKFLOW_KEYWORDS: Record<string, string[]> = {
  'code-review': ['review', 'pr', 'pull request', 'check the code', 'look at the changes'],
  'bug-fix': ['fix', 'bug', 'error', 'broken', 'not working', 'fails', 'crash'],
  'feature-add': ['add', 'implement', 'create', 'build', 'new feature'],
  'refactor': ['refactor', 'clean up', 'reorganize', 'restructure', 'simplify'],
  'test-write': ['test', 'coverage', 'write tests', 'add tests'],
  'deploy': ['deploy', 'release', 'ship', 'publish'],
  'debug': ['debug', 'trace', 'investigate', 'why is', 'figure out'],
  'docs': ['document', 'docs', 'readme', 'explain', 'describe'],
}

function classifyWorkflow(prompt: string): string | null {
  const lower = prompt.toLowerCase()
  for (const [workflow, keywords] of Object.entries(WORKFLOW_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return workflow
    }
  }
  return null
}

function getWorkflowSteps(workflow: string): string[] {
  const steps: Record<string, string[]> = {
    'code-review': [
      'Read the changed files',
      'Check architecture compliance (docs/ARCHITECTURE.md)',
      'Verify test coverage',
      'Report findings',
    ],
    'bug-fix': [
      'Reproduce the issue',
      'Identify root cause',
      'Implement fix',
      'Add regression test',
      'Verify fix',
    ],
    'feature-add': [
      'Check docs/ARCHITECTURE.md for where this belongs',
      'Implement the feature',
      'Add tests',
      'Update documentation if needed',
    ],
    'refactor': [
      'Understand current structure',
      'Plan the refactoring',
      'Make changes incrementally',
      'Verify tests still pass',
    ],
    'test-write': [
      'Identify untested code paths',
      'Write tests for critical paths first',
      'Add edge case coverage',
      'Verify all tests pass',
    ],
    'deploy': ['Check CI status', 'Verify all tests pass', 'Deploy'],
    'debug': ['Read error logs/output', 'Add targeted logging', 'Trace execution path', 'Identify root cause'],
    'docs': ['Read existing docs', 'Identify gaps', 'Write/update documentation', 'Cross-reference with code'],
  }
  return steps[workflow] || ['Execute the task']
}

function extractFilePath(tool: { tool: string; input: Record<string, unknown> }): string | null {
  if (typeof tool.input.file_path === 'string') return tool.input.file_path
  if (typeof tool.input.path === 'string') return tool.input.path
  return null
}

function getFileGroup(files: Set<string>): string | null {
  // Find common directory prefix
  const paths = [...files]
  if (paths.length < 2) return null

  const parts = paths.map(p => p.split('/'))
  const common: string[] = []

  for (let i = 0; i < Math.min(...parts.map(p => p.length)); i++) {
    if (parts.every(p => p[i] === parts[0][i])) {
      common.push(parts[0][i])
    } else {
      break
    }
  }

  return common.length > 1 ? common.join('/') : null
}
