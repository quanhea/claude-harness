import { defineConfig } from 'tsup'

const external = ['@anthropic-ai/claude-agent-sdk']

export default defineConfig([
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    clean: true,
    target: 'node18',
    external,
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    target: 'node18',
    external,
  },
])
