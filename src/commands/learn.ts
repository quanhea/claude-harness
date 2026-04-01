import { resolve } from 'node:path'
import { readSessions } from '../learner/sessions.js'
import { extractPatterns } from '../learner/patterns.js'
import { generateSkillsFromPatterns } from '../learner/skill-generator.js'
import { writeGeneratedFiles } from '../utils/writer.js'
import type { HarnessOptions } from '../types.js'

interface LearnOptions {
  sessions?: string
  dryRun?: boolean
}

export async function learnCommand(options: LearnOptions): Promise<void> {
  const cwd = process.cwd()
  await learn({ cwd, ...options })
}

export async function learn(options: HarnessOptions & LearnOptions = {}): Promise<void> {
  const cwd = resolve(options.cwd ?? process.cwd())
  const sessionCount = parseInt(options.sessions ?? '20', 10)

  console.log(`📚 Reading last ${sessionCount} conversation sessions...`)

  let sessions
  try {
    sessions = await readSessions(cwd, sessionCount)
  } catch {
    console.log('⚠️  Could not read conversation history.')
    console.log('   This requires @anthropic-ai/claude-agent-sdk to be installed.')
    console.log('   Install it with: npm i -D @anthropic-ai/claude-agent-sdk')
    console.log('   Or use Claude Code sessions in ~/.claude/projects/')
    return
  }

  if (sessions.length === 0) {
    console.log('   No sessions found for this project.')
    return
  }

  console.log(`   Found ${sessions.length} sessions`)

  console.log('\n🔎 Extracting patterns...')
  const patterns = extractPatterns(sessions)

  if (patterns.length === 0) {
    console.log('   No recurring patterns found.')
    return
  }

  console.log(`   Found ${patterns.length} patterns`)

  console.log('\n🛠️  Generating skills...')
  const files = generateSkillsFromPatterns(patterns, cwd)

  if (options.dryRun) {
    console.log('\n--- Dry run: would generate ---')
    for (const f of files) {
      console.log(`  ${f.path}`)
    }
    return
  }

  const written = await writeGeneratedFiles(cwd, files, { force: false })

  console.log(`\n✅ Generated ${written.length} skills:`)
  for (const f of written) {
    console.log(`   ${f}`)
  }
}
