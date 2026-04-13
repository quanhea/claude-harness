// src/worker-pool.ts — manages N concurrent claude child processes
import { EventEmitter } from "events";
import { ChildProcess } from "child_process";
import { spawnTask, SpawnOptions } from "./worker";
import { WorkerResult, HarnessConfig } from "./types";

export interface PoolEvents {
  start: (taskId: string, workerIndex: number) => void;
  done: (taskId: string, result: WorkerResult, workerIndex: number) => void;
  drain: () => void;
}

export class WorkerPool extends EventEmitter {
  private queue: string[];
  private prompts: Map<string, string>;
  private active: Map<string, { child: ChildProcess; kill: () => void; index: number }> =
    new Map();
  private concurrency: number;
  private originalConcurrency: number;
  private targetDir: string;
  private outputDir: string;
  private config: HarnessConfig;
  private stopped = false;
  private paused = false;
  private drainResolve: (() => void) | null = null;
  private consecutiveSuccesses = 0;

  constructor(options: {
    tasks: string[];
    prompts: Map<string, string>;  // taskId → rendered prompt text
    concurrency: number;
    targetDir: string;
    outputDir: string;
    config: HarnessConfig;
  }) {
    super();
    this.queue = [...options.tasks];
    this.prompts = options.prompts;
    this.concurrency = Math.min(options.concurrency, Math.max(options.tasks.length, 1));
    this.originalConcurrency = this.concurrency;
    this.targetDir = options.targetDir;
    this.outputDir = options.outputDir;
    this.config = options.config;
  }

  get activeCount(): number {
    return this.active.size;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  getActiveTasks(): Map<string, number> {
    const result = new Map<string, number>();
    for (const [taskId, { index }] of this.active) {
      result.set(taskId, index);
    }
    return result;
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.drainResolve = resolve;
      this.fillWorkers();
    });
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.fillWorkers();
  }

  requeueTask(taskId: string): void {
    this.queue.unshift(taskId);
  }

  stopAcceptingNew(): void {
    this.stopped = true;
    this.queue = [];
  }

  killAll(): void {
    this.stopped = true;
    this.queue = [];
    for (const [, { kill }] of this.active) {
      kill();
    }
  }

  private fillWorkers(): void {
    while (
      !this.stopped &&
      !this.paused &&
      this.active.size < this.concurrency &&
      this.queue.length > 0
    ) {
      const taskId = this.queue.shift()!;
      this.launchWorker(taskId);
    }

    if (this.active.size === 0 && this.queue.length === 0 && this.drainResolve) {
      this.emit("drain");
      this.drainResolve();
      this.drainResolve = null;
    }
  }

  private launchWorker(taskId: string): void {
    const workerIndex = this.findFreeIndex();
    this.emit("start", taskId, workerIndex);

    const spawnOpts: SpawnOptions = {
      targetDir: this.targetDir,
      outputDir: this.outputDir,
      taskId,
      promptTemplate: this.prompts.get(taskId) ?? "",
      config: this.config,
    };

    const { child, promise, kill } = spawnTask(spawnOpts);
    this.active.set(taskId, { child, kill, index: workerIndex });

    promise.then((result) => {
      this.active.delete(taskId);
      this.emit("done", taskId, result, workerIndex);

      // Adaptive concurrency on rate limit
      if (result.error === "rate_limit" || result.error === "overloaded") {
        this.consecutiveSuccesses = 0;
        if (this.concurrency > 1) this.concurrency--;
      } else if (result.status === "COMPLETED") {
        this.consecutiveSuccesses++;
        if (this.consecutiveSuccesses >= 5 && this.concurrency < this.originalConcurrency) {
          this.concurrency++;
          this.consecutiveSuccesses = 0;
        }
      }

      this.fillWorkers();
    });
  }

  private findFreeIndex(): number {
    const used = new Set<number>();
    for (const [, { index }] of this.active) used.add(index);
    for (let i = 0; ; i++) {
      if (!used.has(i)) return i;
    }
  }
}
