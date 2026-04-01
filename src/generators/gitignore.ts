import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ProjectAnalysis } from '../analyzers/project.js'
import type { GeneratedFile } from '../types.js'

const HARNESS_ENTRIES = [
  '',
  '# Claude Code local settings (personal, not shared)',
  '.claude/settings.local.json',
]

const HARNESS_MARKER = '# Claude Code local settings'

export function generateGitignore(analysis: ProjectAnalysis): GeneratedFile[] {
  // We'll handle this specially — read existing .gitignore and append if needed
  return [{
    path: '.gitignore',
    content: '', // Will be computed at write time
    _compute: true,
  } as GeneratedFile & { _compute: boolean }]
}

/**
 * Appends harness entries to .gitignore if not already present.
 * Called by the writer when it encounters a computed file.
 */
export async function computeGitignore(cwd: string): Promise<string> {
  const gitignorePath = join(cwd, '.gitignore')
  let content = ''

  if (existsSync(gitignorePath)) {
    content = await readFile(gitignorePath, 'utf-8')
  }

  // Check if our entries already exist
  if (content.includes(HARNESS_MARKER)) {
    return content
  }

  // Append our entries
  if (content && !content.endsWith('\n')) {
    content += '\n'
  }
  content += HARNESS_ENTRIES.join('\n') + '\n'

  return content
}
