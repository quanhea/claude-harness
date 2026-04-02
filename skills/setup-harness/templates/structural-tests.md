# Template: Structural Tests

> Article: "constraints enforced mechanically via custom linters AND structural tests"
> Structural tests are REAL test files that validate architecture constraints.
> They complement linters: linters check single files, structural tests check cross-file invariants.

---

## Variant: Node.js / TypeScript (vitest or jest)

### File: tests/architecture.test.ts

```typescript
import { describe, it, expect } from '{{test-framework — vitest or @jest/globals}}';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC_DIR = join(__dirname, '..', 'src');

// Collect all source files recursively
function collectFiles(dir: string, ext: string[]): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...collectFiles(fullPath, ext));
    } else if (entry.isFile() && ext.some(e => entry.name.endsWith(e))) {
      files.push(fullPath);
    }
  }
  return files;
}

// Extract imports from a file
function extractImports(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8');
  const imports: string[] = [];
  const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1].startsWith('.')) imports.push(match[1]);
  }
  return imports;
}

// Determine the architectural layer of a file
function getLayer(filePath: string): string | null {
  const rel = relative(SRC_DIR, filePath).toLowerCase();
  if (/\/(types?|models?|interfaces?|schemas?|dto)\//i.test(rel)) return 'types';
  if (/\/config(s|uration)?\//i.test(rel)) return 'config';
  if (/\/(repo(sitory|sitories)?|dal|data|db)\//i.test(rel)) return 'repo';
  if (/\/providers?\//i.test(rel)) return 'providers';
  if (/\/(services?|domain|business)\//i.test(rel)) return 'service';
  if (/\/(runtime|server|middleware|controllers?|handlers?|routes?|api)\//i.test(rel)) return 'runtime';
  if (/\/(ui|components?|pages?|views?|screens?|layouts?)\//i.test(rel)) return 'ui';
  return null;
}

const LAYER_ORDER = ['types', 'config', 'repo', 'providers', 'service', 'runtime', 'ui'];

describe('Architecture: Layer Dependencies', () => {
  const sourceFiles = collectFiles(SRC_DIR, ['.ts', '.tsx', '.js', '.jsx'])
    .filter(f => !f.includes('.test.') && !f.includes('.spec.'));

  it('should not have backward layer dependencies', () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const layer = getLayer(file);
      if (!layer) continue;
      const layerIndex = LAYER_ORDER.indexOf(layer);

      for (const imp of extractImports(file)) {
        // Resolve import to check its layer
        for (const higherLayer of LAYER_ORDER.slice(layerIndex + 1)) {
          if (imp.includes(`/${higherLayer}/`) || imp.includes(`/${higherLayer}s/`)) {
            violations.push(
              `${relative(SRC_DIR, file)} (${layer}) imports from ${higherLayer} layer: ${imp}`
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('should not have circular dependencies between domains', () => {
    // Build domain → domain dependency graph
    const domainDeps = new Map<string, Set<string>>();

    for (const file of sourceFiles) {
      const rel = relative(SRC_DIR, file);
      const domain = rel.split('/')[0];
      if (!domain) continue;

      for (const imp of extractImports(file)) {
        const parts = imp.replace(/^\.\.\//, '').split('/');
        const importDomain = parts[0];
        if (importDomain && importDomain !== domain && !importDomain.startsWith('.')) {
          if (!domainDeps.has(domain)) domainDeps.set(domain, new Set());
          domainDeps.get(domain)!.add(importDomain);
        }
      }
    }

    // Check for cycles using DFS
    const cycles: string[] = [];
    for (const [domain] of domainDeps) {
      const visited = new Set<string>();
      const stack = [domain];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) {
          if (current === domain && visited.size > 1) {
            cycles.push(`Circular: ${domain} → ... → ${domain}`);
          }
          continue;
        }
        visited.add(current);
        const deps = domainDeps.get(current);
        if (deps) stack.push(...deps);
      }
    }

    expect(cycles).toEqual([]);
  });
});

describe('Architecture: File Organization', () => {
  const sourceFiles = collectFiles(SRC_DIR, ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'])
    .filter(f => !f.includes('.test.') && !f.includes('.spec.') && !f.includes('node_modules'));

  it('should not have source files over 300 lines', () => {
    const oversized: string[] = [];
    for (const file of sourceFiles) {
      const lines = readFileSync(file, 'utf-8').split('\n').length;
      if (lines > 300) {
        oversized.push(`${relative(SRC_DIR, file)}: ${lines} lines`);
      }
    }
    expect(oversized).toEqual([]);
  });
});
```

---

## Variant: Python (pytest)

### File: tests/test_architecture.py

```python
"""Structural tests for architecture constraints.

These tests validate cross-file invariants:
- Layer dependency direction
- No circular dependencies between domains
- File size limits
"""

import ast
import os
from pathlib import Path

SRC_DIR = Path(__file__).parent.parent / "{{src-dir — e.g., src or app-name}}"

LAYER_ORDER = ["types", "config", "repo", "providers", "service", "runtime", "ui"]

LAYER_PATTERNS = {
    "types": {"types", "models", "interfaces", "schemas", "dto"},
    "config": {"config", "configs", "configuration", "settings"},
    "repo": {"repo", "repository", "repositories", "dal", "data", "db"},
    "providers": {"providers", "provider", "connectors"},
    "service": {"service", "services", "domain", "business", "usecases"},
    "runtime": {"runtime", "server", "middleware", "controllers", "handlers", "routes", "api", "views"},
    "ui": {"ui", "components", "pages", "views", "screens", "templates"},
}


def get_layer(path: Path) -> str | None:
    parts = [p.lower() for p in path.relative_to(SRC_DIR).parts]
    for layer, patterns in LAYER_PATTERNS.items():
        if any(p in patterns for p in parts):
            return layer
    return None


def collect_python_files(directory: Path) -> list[Path]:
    files = []
    for root, dirs, filenames in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in {"__pycache__", ".venv", "node_modules", "migrations"}]
        for f in filenames:
            if f.endswith(".py") and not f.startswith("test_") and not f.endswith("_test.py"):
                files.append(Path(root) / f)
    return files


def extract_imports(filepath: Path) -> list[str]:
    try:
        tree = ast.parse(filepath.read_text())
    except SyntaxError:
        return []
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module and node.level > 0:
            imports.append(node.module)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imports.append(node.module)
    return imports


class TestLayerDependencies:
    def test_no_backward_dependencies(self):
        if not SRC_DIR.exists():
            return
        violations = []
        for filepath in collect_python_files(SRC_DIR):
            layer = get_layer(filepath)
            if not layer:
                continue
            layer_idx = LAYER_ORDER.index(layer)
            for imp in extract_imports(filepath):
                imp_lower = imp.lower()
                for higher_layer in LAYER_ORDER[layer_idx + 1 :]:
                    patterns = LAYER_PATTERNS[higher_layer]
                    if any(p in imp_lower.split(".") for p in patterns):
                        violations.append(
                            f"{filepath.relative_to(SRC_DIR)} ({layer}) imports from {higher_layer}: {imp}"
                        )
        assert violations == [], f"Backward dependencies found:\n" + "\n".join(violations)

    def test_no_files_over_300_lines(self):
        if not SRC_DIR.exists():
            return
        oversized = []
        for filepath in collect_python_files(SRC_DIR):
            lines = len(filepath.read_text().splitlines())
            if lines > 300:
                oversized.append(f"{filepath.relative_to(SRC_DIR)}: {lines} lines")
        assert oversized == [], f"Files over 300 lines:\n" + "\n".join(oversized)
```

---

## Adaptation Instructions

1. Pick the variant matching the project's language and test framework
2. Replace `{{test-framework}}` and `{{src-dir}}` with actual values
3. Adjust `LAYER_ORDER` and `LAYER_PATTERNS` if the project uses different layer names
4. The test file goes in the project's test directory (alongside other tests)
5. If the project already has architecture tests, do NOT overwrite — merge patterns
6. These tests run with the normal test suite (`npm test`, `pytest`, etc.)
