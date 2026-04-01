import type { ProjectAnalysis } from '../analyzers/project.js'
import type { GeneratedFile } from '../types.js'
import { generateClaudeMd } from './claude-md.js'
import { generateSettings } from './settings.js'
import { generateDocs } from './docs.js'
import { generateArchitecture } from './architecture.js'
import { generateRules } from './rules.js'
import { generateAgents } from './agents.js'
import { generateSkills } from './skills.js'
import { generateGitignore } from './gitignore.js'

export function generateAll(analysis: ProjectAnalysis): GeneratedFile[] {
  return [
    ...generateClaudeMd(analysis),
    ...generateSettings(analysis),
    ...generateDocs(analysis),
    ...generateArchitecture(analysis),
    ...generateRules(analysis),
    ...generateAgents(analysis),
    ...generateSkills(analysis),
    ...generateGitignore(analysis),
  ]
}
