import { resolve } from 'node:path'
import { analyzeProject } from '../analyzers/project.js'
import { generateAll } from '../generators/index.js'
import { writeGeneratedFiles } from '../utils/writer.js'
import type { HarnessOptions } from '../types.js'

interface SyncOptions {
  dryRun?: boolean
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  const cwd = process.cwd()
  await sync({ cwd, ...options })
}

export async function sync(options: HarnessOptions = {}): Promise<void> {
  const cwd = resolve(options.cwd ?? process.cwd())

  console.log('🔄 Re-analyzing project...')
  const analysis = await analyzeProject(cwd, { git: options.git !== false })

  console.log('📝 Regenerating scaffolding...')
  const files = generateAll(analysis)

  if (options.dryRun) {
    console.log('\n--- Dry run: would update ---')
    for (const f of files) {
      console.log(`  ${f.path}`)
    }
    return
  }

  // Sync only updates files that have changed, preserves user edits on marked files
  const written = await writeGeneratedFiles(cwd, files, { force: false, syncMode: true })

  if (written.length === 0) {
    console.log('\n✅ Everything is up to date.')
  } else {
    console.log(`\n✅ Updated ${written.length} files:`)
    for (const f of written) {
      console.log(`   ${f}`)
    }
  }
}
