# Pattern Catalog

Common workflow patterns to detect in conversation history and codify as project skills.

## Workflow Patterns

### code-review
**Triggers**: "review", "PR", "pull request", "check the code", "look at changes"
**Steps**:
1. Read the changed files (git diff or specific files)
2. Check architecture compliance
3. Verify test coverage
4. Report findings with severity levels

### bug-fix
**Triggers**: "fix", "bug", "error", "broken", "not working", "fails", "crash"
**Steps**:
1. Reproduce the issue
2. Identify root cause
3. Implement fix
4. Add regression test
5. Verify fix

### feature-add
**Triggers**: "add", "implement", "create", "build", "new feature"
**Steps**:
1. Check architecture for where this belongs
2. Implement the feature
3. Add tests
4. Update docs if needed

### refactor
**Triggers**: "refactor", "clean up", "reorganize", "restructure", "simplify"
**Steps**:
1. Understand current structure
2. Plan the refactoring
3. Make changes incrementally
4. Verify tests still pass

### test-write
**Triggers**: "test", "coverage", "write tests", "add tests"
**Steps**:
1. Identify untested code paths
2. Write tests for critical paths first
3. Add edge case coverage
4. Verify all tests pass

### deploy
**Triggers**: "deploy", "release", "ship", "publish"
**Steps**:
1. Check CI status
2. Verify all tests pass
3. Build and deploy

### debug
**Triggers**: "debug", "trace", "investigate", "why is", "figure out"
**Steps**:
1. Read error logs/output
2. Add targeted logging
3. Trace execution path
4. Identify root cause

### documentation
**Triggers**: "document", "docs", "readme", "explain", "describe"
**Steps**:
1. Read existing docs
2. Identify gaps
3. Write/update documentation
4. Cross-reference with code

## Command Patterns

Frequently repeated shell commands that could become skills:
- Database migrations
- Seed data generation
- Environment setup
- API testing
- Log analysis
- Performance profiling
