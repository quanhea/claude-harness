import type { ProjectAnalysis } from '../analyzers/project.js'
import type { GeneratedFile } from '../types.js'

export function generateSettings(analysis: ProjectAnalysis): GeneratedFile[] {
  const { testCommand, lintCommand, buildCommand, packageManager } = analysis

  // Build allowed tool patterns based on detected project
  const allowPatterns: string[] = [
    'Read', 'Glob', 'Grep', 'Write', 'Edit',
  ]

  // Allow common safe commands
  const safeCommands = ['git status', 'git diff', 'git log', 'git branch']

  if (testCommand) {
    safeCommands.push(testCommand)
  }
  if (lintCommand) {
    safeCommands.push(lintCommand)
  }
  if (buildCommand) {
    safeCommands.push(buildCommand)
  }

  // Package manager installs
  const pmCommands: string[] = []
  switch (packageManager) {
    case 'npm':
      pmCommands.push('npm install *', 'npm test *', 'npm run *', 'npx *')
      break
    case 'yarn':
      pmCommands.push('yarn add *', 'yarn test *', 'yarn *')
      break
    case 'pnpm':
      pmCommands.push('pnpm add *', 'pnpm test *', 'pnpm run *', 'pnpx *')
      break
    case 'bun':
      pmCommands.push('bun add *', 'bun test *', 'bun run *', 'bunx *')
      break
    case 'pip':
    case 'uv':
    case 'poetry':
      pmCommands.push('pip install *', 'python -m pytest *', 'uv *', 'poetry *')
      break
    case 'cargo':
      pmCommands.push('cargo *')
      break
    case 'go':
      pmCommands.push('go *')
      break
  }

  const bashAllowed = [...safeCommands, ...pmCommands].map(cmd => `Bash(${cmd})`)
  allowPatterns.push(...bashAllowed)

  const settings = {
    permissions: {
      allow: allowPatterns,
      deny: [
        'Bash(rm -rf *)',
        'Bash(git push --force *)',
        'Bash(git reset --hard *)',
      ],
    },
    env: {} as Record<string, string>,
  }

  const localSettings = {
    permissions: {
      allow: [] as string[],
      deny: [] as string[],
    },
    env: {} as Record<string, string>,
  }

  return [
    {
      path: '.claude/settings.json',
      content: JSON.stringify(settings, null, 2) + '\n',
      preserveExisting: true,
    },
    {
      path: '.claude/settings.local.json',
      content: JSON.stringify(localSettings, null, 2) + '\n',
      preserveExisting: true,
    },
  ]
}
