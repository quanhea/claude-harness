import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { computeGitignore } from '../generators/gitignore.js'
import type { GeneratedFile } from '../types.js'

interface WriteOptions {
  force?: boolean
  syncMode?: boolean
}

export async function writeGeneratedFiles(
  cwd: string,
  files: GeneratedFile[],
  options: WriteOptions = {},
): Promise<string[]> {
  const written: string[] = []

  for (const file of files) {
    const fullPath = join(cwd, file.path)
    const exists = existsSync(fullPath)

    // Special handling for .gitignore — computed dynamically
    if (file.path === '.gitignore') {
      const computed = await computeGitignore(cwd)
      const current = exists ? await readFile(fullPath, 'utf-8') : ''
      if (computed !== current) {
        await writeFile(fullPath, computed, 'utf-8')
        written.push(file.path)
      }
      continue
    }

    // In non-force mode, skip files marked as preserveExisting
    if (exists && file.preserveExisting && !options.force) {
      continue
    }

    // In sync mode, skip files whose content hasn't changed
    if (exists && options.syncMode) {
      const current = await readFile(fullPath, 'utf-8')
      if (current === file.content) {
        continue
      }
      // If file is marked preserveExisting in sync mode, skip it
      if (file.preserveExisting) {
        continue
      }
    }

    await mkdir(dirname(fullPath), { recursive: true })
    await writeFile(fullPath, file.content, 'utf-8')
    written.push(file.path)
  }

  return written
}
