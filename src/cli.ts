import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { syncCommand } from './commands/sync.js'
import { learnCommand } from './commands/learn.js'

const program = new Command()

program
  .name('claude-harness')
  .description('Scaffold any project for agent-first development with Claude Code')
  .version('0.1.0')

program
  .command('init')
  .description('Analyze project and generate Claude Code scaffolding')
  .option('-f, --force', 'Overwrite existing files')
  .option('--no-git', 'Skip git-related analysis')
  .option('--dry-run', 'Show what would be generated without writing files')
  .action(initCommand)

program
  .command('sync')
  .description('Re-analyze project and update stale docs')
  .option('--dry-run', 'Show what would be updated without writing files')
  .action(syncCommand)

program
  .command('learn')
  .description('Read conversation history and generate project-embedded skills')
  .option('--sessions <n>', 'Number of recent sessions to analyze', '20')
  .action(learnCommand)

program.parse()
