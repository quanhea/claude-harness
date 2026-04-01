import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { glob } from 'glob'
import type { Language, Framework, PackageManager, TestFramework } from '../types.js'

export interface ProjectAnalysis {
  cwd: string
  name: string
  languages: Language[]
  frameworks: Framework[]
  packageManager: PackageManager
  testFramework: TestFramework | null
  estimatedLoc: number
  isMonorepo: boolean
  domains: string[]
  entryPoints: string[]
  buildCommand: string | null
  testCommand: string | null
  lintCommand: string | null
  existingClaude: boolean
  existingDocs: boolean
  hasGit: boolean
  gitDefaultBranch: string
  description: string
}

interface AnalyzeOptions {
  git?: boolean
}

export async function analyzeProject(cwd: string, options: AnalyzeOptions = {}): Promise<ProjectAnalysis> {
  const [languages, pkgInfo, structure, gitInfo, existing] = await Promise.all([
    detectLanguages(cwd),
    detectPackageInfo(cwd),
    analyzeStructure(cwd),
    options.git !== false ? analyzeGit(cwd) : { hasGit: false, defaultBranch: 'main' },
    detectExisting(cwd),
  ])

  return {
    cwd,
    name: pkgInfo.name || basename(cwd),
    languages,
    frameworks: pkgInfo.frameworks,
    packageManager: pkgInfo.packageManager,
    testFramework: pkgInfo.testFramework,
    estimatedLoc: structure.estimatedLoc,
    isMonorepo: structure.isMonorepo,
    domains: structure.domains,
    entryPoints: structure.entryPoints,
    buildCommand: pkgInfo.buildCommand,
    testCommand: pkgInfo.testCommand,
    lintCommand: pkgInfo.lintCommand,
    existingClaude: existing.claude,
    existingDocs: existing.docs,
    hasGit: gitInfo.hasGit,
    gitDefaultBranch: gitInfo.defaultBranch,
    description: pkgInfo.description || '',
  }
}

// --- Language Detection ---

const LANG_EXTENSIONS: Record<string, Language> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin', '.kts': 'kotlin',
  '.cs': 'csharp',
}

async function detectLanguages(cwd: string): Promise<Language[]> {
  const counts = new Map<Language, number>()

  const files = await glob('**/*.{ts,tsx,js,jsx,mjs,cjs,py,rs,go,java,rb,php,swift,kt,kts,cs}', {
    cwd,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/vendor/**', '**/target/**', '**/__pycache__/**', '**/venv/**'],
    nodir: true,
  })

  for (const file of files) {
    const ext = '.' + file.split('.').pop()!
    const lang = LANG_EXTENSIONS[ext]
    if (lang) {
      counts.set(lang, (counts.get(lang) || 0) + 1)
    }
  }

  // Sort by file count descending
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)
}

// --- Package Info ---

interface PackageInfo {
  name: string
  description: string
  frameworks: Framework[]
  packageManager: PackageManager
  testFramework: TestFramework | null
  buildCommand: string | null
  testCommand: string | null
  lintCommand: string | null
}

async function detectPackageInfo(cwd: string): Promise<PackageInfo> {
  const result: PackageInfo = {
    name: '',
    description: '',
    frameworks: [],
    packageManager: 'other',
    testFramework: null,
    buildCommand: null,
    testCommand: null,
    lintCommand: null,
  }

  // Node.js projects
  const pkgPath = join(cwd, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'))
      result.name = pkg.name || ''
      result.description = pkg.description || ''

      // Scripts
      const scripts = pkg.scripts || {}
      result.buildCommand = scripts.build ? `npm run build` : null
      result.testCommand = scripts.test ? `npm test` : null
      result.lintCommand = scripts.lint ? `npm run lint` : null

      // Package manager
      if (existsSync(join(cwd, 'bun.lockb')) || existsSync(join(cwd, 'bun.lock'))) {
        result.packageManager = 'bun'
      } else if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
        result.packageManager = 'pnpm'
      } else if (existsSync(join(cwd, 'yarn.lock'))) {
        result.packageManager = 'yarn'
      } else {
        result.packageManager = 'npm'
      }

      // Frameworks
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (allDeps['next']) result.frameworks.push('next')
      else if (allDeps['react']) result.frameworks.push('react')
      if (allDeps['vue']) result.frameworks.push('vue')
      if (allDeps['@angular/core']) result.frameworks.push('angular')
      if (allDeps['svelte']) result.frameworks.push('svelte')
      if (allDeps['express']) result.frameworks.push('express')
      if (allDeps['fastify']) result.frameworks.push('fastify')
      if (allDeps['@nestjs/core']) result.frameworks.push('nest')

      // Test framework
      if (allDeps['vitest']) result.testFramework = 'vitest'
      else if (allDeps['jest']) result.testFramework = 'jest'
      else if (allDeps['mocha']) result.testFramework = 'mocha'
    } catch { /* ignore parse errors */ }
  }

  // Python projects
  const pyprojectPath = join(cwd, 'pyproject.toml')
  const requirementsPath = join(cwd, 'requirements.txt')
  if (existsSync(pyprojectPath)) {
    try {
      const content = await readFile(pyprojectPath, 'utf-8')
      if (content.includes('[tool.poetry]')) result.packageManager = 'poetry'
      else if (content.includes('[tool.uv]') || existsSync(join(cwd, 'uv.lock'))) result.packageManager = 'uv'
      else result.packageManager = 'pip'

      if (content.includes('django')) result.frameworks.push('django')
      if (content.includes('flask')) result.frameworks.push('flask')
      if (content.includes('fastapi')) result.frameworks.push('fastapi')
      if (content.includes('pytest')) result.testFramework = 'pytest'

      // Extract name
      const nameMatch = content.match(/name\s*=\s*"([^"]+)"/)
      if (nameMatch) result.name = nameMatch[1]
    } catch { /* ignore */ }
  } else if (existsSync(requirementsPath)) {
    result.packageManager = 'pip'
  }

  // Rust
  if (existsSync(join(cwd, 'Cargo.toml'))) {
    result.packageManager = 'cargo'
    result.testFramework = 'cargo-test'
    result.buildCommand = 'cargo build'
    result.testCommand = 'cargo test'
    try {
      const cargo = await readFile(join(cwd, 'Cargo.toml'), 'utf-8')
      const nameMatch = cargo.match(/name\s*=\s*"([^"]+)"/)
      if (nameMatch) result.name = nameMatch[1]
    } catch { /* ignore */ }
  }

  // Go
  if (existsSync(join(cwd, 'go.mod'))) {
    result.packageManager = 'go'
    result.testFramework = 'go-test'
    result.buildCommand = 'go build ./...'
    result.testCommand = 'go test ./...'
    try {
      const gomod = await readFile(join(cwd, 'go.mod'), 'utf-8')
      const modMatch = gomod.match(/module\s+(\S+)/)
      if (modMatch) result.name = modMatch[1].split('/').pop() || modMatch[1]
      if (gomod.includes('gin-gonic')) result.frameworks.push('gin')
      if (gomod.includes('labstack/echo')) result.frameworks.push('echo')
    } catch { /* ignore */ }
  }

  // Ruby
  if (existsSync(join(cwd, 'Gemfile'))) {
    result.packageManager = 'bundler'
    result.testFramework = 'rspec'
    try {
      const gemfile = await readFile(join(cwd, 'Gemfile'), 'utf-8')
      if (gemfile.includes('rails')) result.frameworks.push('rails')
    } catch { /* ignore */ }
  }

  // Java
  if (existsSync(join(cwd, 'pom.xml'))) {
    result.packageManager = 'maven'
    result.testFramework = 'junit'
    result.buildCommand = 'mvn package'
    result.testCommand = 'mvn test'
  } else if (existsSync(join(cwd, 'build.gradle')) || existsSync(join(cwd, 'build.gradle.kts'))) {
    result.packageManager = 'gradle'
    result.testFramework = 'junit'
    result.buildCommand = './gradlew build'
    result.testCommand = './gradlew test'
  }

  // PHP
  if (existsSync(join(cwd, 'composer.json'))) {
    result.packageManager = 'composer'
    try {
      const composer = JSON.parse(await readFile(join(cwd, 'composer.json'), 'utf-8'))
      result.name = composer.name || ''
      const allDeps = { ...composer.require, ...composer['require-dev'] }
      if (allDeps['laravel/framework']) result.frameworks.push('laravel')
      if (allDeps['phpunit/phpunit']) result.testFramework = 'phpunit'
    } catch { /* ignore */ }
  }

  return result
}

// --- Structure Analysis ---

interface StructureInfo {
  estimatedLoc: number
  isMonorepo: boolean
  domains: string[]
  entryPoints: string[]
}

async function analyzeStructure(cwd: string): Promise<StructureInfo> {
  const files = await glob('**/*.{ts,tsx,js,jsx,mjs,py,rs,go,java,rb,php,swift,kt,cs}', {
    cwd,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/vendor/**', '**/target/**', '**/__pycache__/**', '**/venv/**', '**/.next/**'],
    nodir: true,
  })

  // Rough LOC estimate: avg 50 lines per file
  const estimatedLoc = files.length * 50

  // Detect monorepo
  const hasWorkspaces = existsSync(join(cwd, 'packages')) || existsSync(join(cwd, 'apps'))
  const hasLernaJson = existsSync(join(cwd, 'lerna.json'))
  const hasPnpmWorkspace = existsSync(join(cwd, 'pnpm-workspace.yaml'))
  const isMonorepo = hasWorkspaces || hasLernaJson || hasPnpmWorkspace

  // Detect domains (top-level src dirs or packages)
  const domains: string[] = []
  const srcDir = existsSync(join(cwd, 'src')) ? 'src' : existsSync(join(cwd, 'lib')) ? 'lib' : null

  if (srcDir) {
    const srcEntries = await glob(`${srcDir}/*/`, { cwd, ignore: ['**/__tests__/**'] })
    domains.push(...srcEntries.map(d => d.replace(/\/$/, '').split('/').pop()!).filter(Boolean))
  }

  if (isMonorepo) {
    const pkgDirs = await glob('{packages,apps}/*/package.json', { cwd })
    domains.push(...pkgDirs.map(p => p.split('/')[1]))
  }

  // Detect entry points
  const entryPoints: string[] = []
  const commonEntries = [
    'src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js',
    'src/app.ts', 'src/app.js', 'src/server.ts', 'src/server.js',
    'index.ts', 'index.js', 'main.ts', 'main.js',
    'app.py', 'main.py', 'manage.py',
    'main.go', 'cmd/main.go',
    'src/main.rs', 'src/lib.rs',
  ]
  for (const entry of commonEntries) {
    if (existsSync(join(cwd, entry))) {
      entryPoints.push(entry)
    }
  }

  return { estimatedLoc, isMonorepo, domains, entryPoints }
}

// --- Git Analysis ---

interface GitInfo {
  hasGit: boolean
  defaultBranch: string
}

async function analyzeGit(cwd: string): Promise<GitInfo> {
  const hasGit = existsSync(join(cwd, '.git'))
  let defaultBranch = 'main'

  if (hasGit) {
    try {
      const { execSync } = await import('node:child_process')
      const branch = execSync('git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo refs/heads/main', {
        cwd,
        encoding: 'utf-8',
      }).trim()
      defaultBranch = branch.split('/').pop() || 'main'
    } catch {
      defaultBranch = 'main'
    }
  }

  return { hasGit, defaultBranch }
}

// --- Existing Setup Detection ---

interface ExistingInfo {
  claude: boolean
  docs: boolean
}

async function detectExisting(cwd: string): Promise<ExistingInfo> {
  return {
    claude: existsSync(join(cwd, '.claude')) || existsSync(join(cwd, 'CLAUDE.md')),
    docs: existsSync(join(cwd, 'docs')),
  }
}
