import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'

export interface SessionMessage {
  role: 'user' | 'assistant'
  content: string
  toolUses?: Array<{
    tool: string
    input: Record<string, unknown>
  }>
}

export interface SessionData {
  id: string
  messages: SessionMessage[]
}

/**
 * Read conversation sessions for the project at the given cwd.
 * Tries two strategies:
 * 1. Claude Agent SDK (if installed) — uses listSessions/getSessionMessages
 * 2. Direct file reading from ~/.claude/projects/
 */
export async function readSessions(cwd: string, maxSessions: number): Promise<SessionData[]> {
  // Try SDK first
  try {
    return await readSessionsViaSdk(cwd, maxSessions)
  } catch {
    // Fall back to direct file reading
  }

  return readSessionsFromDisk(cwd, maxSessions)
}

async function readSessionsViaSdk(cwd: string, maxSessions: number): Promise<SessionData[]> {
  // Dynamic import — only works if SDK is installed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sdk: any = await import('@anthropic-ai/claude-agent-sdk')
  const sessionsResult = await sdk.listSessions({ limit: maxSessions })
  const sessionList: any[] = Array.isArray(sessionsResult) ? sessionsResult : sessionsResult?.sessions ?? []

  const results: SessionData[] = []

  for (const session of sessionList) {
    try {
      const messagesResult = await sdk.getSessionMessages(session.id)
      const messageList: any[] = Array.isArray(messagesResult) ? messagesResult : messagesResult?.messages ?? []
      const parsed: SessionMessage[] = []

      for (const msg of messageList) {
        if (msg.type === 'user' || msg.type === 'assistant') {
          const content = typeof msg.content === 'string'
            ? msg.content
            : Array.isArray(msg.content)
              ? msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
              : ''

          const toolUses = msg.type === 'assistant' && Array.isArray(msg.content)
            ? msg.content
                .filter((b: any) => b.type === 'tool_use')
                .map((b: any) => ({ tool: b.name, input: b.input }))
            : undefined

          if (content || (toolUses && toolUses.length > 0)) {
            parsed.push({ role: msg.type as 'user' | 'assistant', content, toolUses })
          }
        }
      }

      if (parsed.length > 0) {
        results.push({ id: session.id, messages: parsed })
      }
    } catch {
      // Skip sessions that can't be read
    }
  }

  return results
}

async function readSessionsFromDisk(cwd: string, maxSessions: number): Promise<SessionData[]> {
  // Build the project directory name Claude Code uses
  const projectDirName = cwd.replace(/\//g, '-')
  const projectsDir = join(homedir(), '.claude', 'projects', projectDirName)

  if (!existsSync(projectsDir)) {
    return []
  }

  // Look for JSONL session files
  const entries = await readdir(projectsDir, { withFileTypes: true })
  const jsonlFiles = entries
    .filter(e => e.isFile() && e.name.endsWith('.jsonl'))
    .map(e => ({
      name: e.name,
      path: join(projectsDir, e.name),
    }))
    .slice(-maxSessions)

  const results: SessionData[] = []

  for (const file of jsonlFiles) {
    try {
      const content = await readFile(file.path, 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean)
      const messages: SessionMessage[] = []

      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          if (entry.type === 'user' || entry.type === 'assistant') {
            const text = typeof entry.message?.content === 'string'
              ? entry.message.content
              : Array.isArray(entry.message?.content)
                ? entry.message.content
                    .filter((b: { type: string }) => b.type === 'text')
                    .map((b: { text: string }) => b.text)
                    .join('\n')
                : ''

            if (text) {
              messages.push({ role: entry.type, content: text })
            }
          }
        } catch {
          // Skip malformed lines
        }
      }

      if (messages.length > 0) {
        results.push({
          id: basename(file.name, '.jsonl'),
          messages,
        })
      }
    } catch {
      // Skip unreadable files
    }
  }

  return results
}
