import { resolve } from 'node:path'
import { analyzeProject } from '../analyzers/project.js'
import { generateAll } from '../generators/index.js'
import { writeGeneratedFiles } from '../utils/writer.js'
import type { HarnessOptions } from '../types.js'

interface InitOptions {
  force?: boolean
  git?: boolean
  dryRun?: boolean
}

export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = process.cwd()
  await init({ cwd, ...options })
}

export async function init(options: HarnessOptions = {}): Promise<void> {
  const cwd = resolve(options.cwd ?? process.cwd())

  console.log('🔍 Analyzing project...')
  const analysis = await analyzeProject(cwd, { git: options.git !== false })

  console.log(`   Language: ${analysis.languages.join(', ')}`)
  console.log(`   Framework: ${analysis.frameworks.join(', ') || 'none detected'}`)
  console.log(`   Package manager: ${analysis.packageManager}`)
  console.log(`   LOC: ~${analysis.estimatedLoc.toLocaleString()}`)
  if (analysis.existingClaude) {
    console.log(`   Existing .claude/ detected — will preserve and extend`)
  }

  console.log('\n📝 Generating scaffolding...')
  const files = generateAll(analysis)

  if (options.dryRun) {
    console.log('\n--- Dry run: would generate ---')
    for (const f of files) {
      console.log(`  ${f.preserveExisting ? '(preserve)' : '(write)'} ${f.path}`)
    }
    return
  }

  const written = await writeGeneratedFiles(cwd, files, { force: options.force })

  console.log(`\n✅ Generated ${written.length} files:`)
  for (const f of written) {
    console.log(`   ${f}`)
  }

  console.log('\n🎯 Next steps:')
  console.log('   1. Review .claude/CLAUDE.md and customize for your project')
  console.log('   2. Run `claude` to start using Claude Code with your new harness')
  console.log('   3. Run `npx claude-harness learn` to generate skills from your conversation history')
  console.log('   4. Run `npx claude-harness sync` periodically to keep docs fresh')
}
