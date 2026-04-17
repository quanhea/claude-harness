// src/paths.ts — project path escaping, mirrors Claude Code's convention.
// /Users/foo/code/bar → -Users-foo-code-bar (all non-alphanumeric → hyphen)
import * as os from "os";
import * as path from "path";

const MAX_SANITIZED_LENGTH = 200;

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function sanitizePath(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, "-");
  if (sanitized.length <= MAX_SANITIZED_LENGTH) return sanitized;
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${simpleHash(name)}`;
}

export function getProjectsDir(): string {
  return path.join(os.homedir(), ".claude-harness", "projects");
}

export function getProjectDir(targetDir: string): string {
  return path.join(getProjectsDir(), sanitizePath(path.resolve(targetDir)));
}
