import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawn } from "bun";
import { header, log, section } from "../../utils/logger.ts";
import type { DemoResult } from "../../utils/types.ts";

/**
 * Counter race condition SOLVED using mutex
 *
 * This demonstrates how a mutex prevents race conditions by ensuring
 * exclusive access during the read-modify-write operation.
 */

const COUNTER_FILE = "/tmp/os-demo-counter-solved.json";

interface CounterState {
  value: number;
}

export async function demonstrateCounterSolution(): Promise<DemoResult> {
  header("Race Condition Solution: Counter with Mutex");

  try {
    // Initialize counter
    section("Initializing Shared Counter");
    initializeCounter();
    log("Counter initialized to 0", "success");

    // Spawn worker processes
    section("Spawning Worker Processes (with mutex protection)");
    const numWorkers = 5;
    const incrementsPerWorker = 20;

    log(
      `Spawning ${numWorkers} workers, each will increment ${incrementsPerWorker} times`,
      "info"
    );
    log(`Expected final value: ${numWorkers * incrementsPerWorker}`, "info");

    const workers: Promise<number | null>[] = [];

    for (let i = 0; i < numWorkers; i++) {
      const worker = spawn({
        cmd: [
          "bun",
          "run",
          "src/race-conditions/counter/worker-mutex.ts",
          String(i + 1),
          String(incrementsPerWorker),
        ],
        stderr: "inherit",
        stdout: "inherit",
      });
      workers.push(worker.exited);
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    // Check final value
    section("Solution Results");
    const finalState = readCounter();
    const expected = numWorkers * incrementsPerWorker;

    log(`Expected value: ${expected}`, "info");
    log(`Actual value: ${finalState.value}`, "info");

    if (finalState.value === expected) {
      log("SUCCESS! All increments completed correctly", "success");
      log("The mutex prevented the race condition", "success");
    } else {
      log(`Still lost ${expected - finalState.value} updates`, "warn");
    }

    cleanup();

    return {
      success: true,
      message: `Counter solution: ${finalState.value}/${expected} (mutex protected)`,
      output:
        finalState.value === expected
          ? "No lost updates!"
          : `Lost ${expected - finalState.value}`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Demo failed: ${errorMsg}`, "error");
    cleanup();
    return {
      success: false,
      message: "Counter solution demo failed",
      error: errorMsg,
    };
  }
}

function initializeCounter(): void {
  const initialState: CounterState = { value: 0 };
  writeFileSync(COUNTER_FILE, JSON.stringify(initialState), "utf8");
}

function readCounter(): CounterState {
  try {
    const data = readFileSync(COUNTER_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return { value: 0 };
  }
}

function cleanup(): void {
  if (existsSync(COUNTER_FILE)) {
    try {
      const fs = require("fs");
      fs.unlinkSync(COUNTER_FILE);
      log("Cleaned up counter file", "info");
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  demonstrateCounterSolution()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
