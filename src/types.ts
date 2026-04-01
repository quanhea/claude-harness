export interface HarnessOptions {
  cwd?: string
  force?: boolean
  git?: boolean
  dryRun?: boolean
}

export interface GeneratedFile {
  path: string
  content: string
  /** If true, won't overwrite existing file unless --force */
  preserveExisting?: boolean
}

export type Language = 'typescript' | 'javascript' | 'python' | 'rust' | 'go' | 'java' | 'ruby' | 'php' | 'swift' | 'kotlin' | 'csharp' | 'other'

export type Framework =
  | 'next' | 'react' | 'vue' | 'angular' | 'svelte' | 'express' | 'fastify' | 'nest'
  | 'django' | 'flask' | 'fastapi'
  | 'rails'
  | 'spring'
  | 'gin' | 'echo'
  | 'actix' | 'axum'
  | 'laravel'
  | 'other'

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'poetry' | 'uv' | 'cargo' | 'go' | 'maven' | 'gradle' | 'bundler' | 'composer' | 'swift' | 'other'

export type TestFramework = 'vitest' | 'jest' | 'mocha' | 'pytest' | 'unittest' | 'rspec' | 'junit' | 'go-test' | 'cargo-test' | 'phpunit' | 'xctest' | 'other'
