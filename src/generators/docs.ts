import type { ProjectAnalysis } from '../analyzers/project.js'
import type { GeneratedFile } from '../types.js'

export function generateDocs(analysis: ProjectAnalysis): GeneratedFile[] {
  const files: GeneratedFile[] = []

  // Quality doc
  const qualityContent = generateQualityDoc(analysis)
  files.push({ path: 'docs/QUALITY.md', content: qualityContent })

  // Design docs index
  files.push({
    path: 'docs/design-docs/index.md',
    content: `# Design Documents

This directory contains design documents for ${analysis.name}.

## Status Legend

| Status | Meaning |
|--------|---------|
| ✅ Verified | Design matches implementation |
| ⚠️ Draft | Design proposed, not yet implemented |
| 🔄 In Progress | Partially implemented |
| ❌ Superseded | Replaced by a newer design |

## Documents

_No design documents yet. Create one with \`/harness-plan\`._
`,
    preserveExisting: true,
  })

  // Exec plans
  files.push({
    path: 'docs/exec-plans/active/.gitkeep',
    content: '',
    preserveExisting: true,
  })
  files.push({
    path: 'docs/exec-plans/completed/.gitkeep',
    content: '',
    preserveExisting: true,
  })

  // Product specs index
  files.push({
    path: 'docs/product-specs/index.md',
    content: `# Product Specifications

Product specs for ${analysis.name}.

_No specs yet. Add product specifications here as the project evolves._
`,
    preserveExisting: true,
  })

  // References index
  files.push({
    path: 'docs/references/index.md',
    content: `# References

External reference material for ${analysis.name}.

Store LLM-friendly documentation (e.g., \`*-llms.txt\` files) and API references here.
Agents can read these to understand external dependencies.

_No references yet. Add external docs, API references, or llms.txt files here._
`,
    preserveExisting: true,
  })

  // Encyclopedia index
  files.push({
    path: 'docs/encyclopedia/index.md',
    content: `# Encyclopedia

Auto-generated codebase knowledge for ${analysis.name}.

Run \`npx claude-harness learn\` or use the \`/harness-sync\` skill to populate this.

## Contents

_Not yet generated. Run \`npx claude-harness learn\` to generate from conversation history._
`,
    preserveExisting: true,
  })

  return files
}

function generateQualityDoc(analysis: ProjectAnalysis): string {
  const domains = analysis.domains.length > 0 ? analysis.domains : ['(project root)']

  const rows = domains.map(d => `| ${d} | — | — | — | — | Not yet graded |`).join('\n')

  return `# Quality Grades

Quality assessment for ${analysis.name}. Updated by \`/harness-quality\` or \`npx claude-harness sync\`.

## Grading Scale

| Grade | Meaning |
|-------|---------|
| A | Production-ready, well-tested, documented |
| B | Functional, reasonable test coverage, minor gaps |
| C | Works but has significant gaps |
| D | Fragile, undertested, or poorly documented |
| F | Broken or unmaintainable |

## Domain Grades

| Domain | Architecture | Testing | Documentation | Reliability | Notes |
|--------|-------------|---------|---------------|-------------|-------|
${rows}

## Technical Debt

_Track known technical debt items here. Use \`/harness-quality\` to scan for issues._
`
}
