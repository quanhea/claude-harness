# Changelog

## 1.0.0

- Initial release
- TypeScript CLI that scaffolds any project for agent-first development
- 28 independent tasks run in one flat parallel pool — no phases, no gates, no cross-task dependencies
- Each prompt is self-contained: it reads the project directly and self-skips if the task doesn't apply (e.g. frontend docs on a backend project)
- Atomic state persistence with crash recovery via `--resume`
- Adaptive concurrency: reduces parallelism on rate limit, restores on consecutive successes
- Graceful shutdown: first Ctrl+C stops queue, second kills all workers
- Gardener: background cron that scans tracked docs for references that no longer match the live code and commits fix-up edits in place (no separate encyclopedia directory — the blog's "encyclopedia" is a metaphor, not a path)
- `claude-harness gardener add/remove/list/run` subcommands
- Terminal progress bar with per-task status in TTY mode
- `setup-report.md` generated on completion with task timing and status
