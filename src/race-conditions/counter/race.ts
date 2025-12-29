import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawn } from "bun";
import { header, log, logRace, section } from "../../utils/logger.ts";
import type { DemoResult } from "../../utils/types.ts";

/**
 * Demonstrates the classic counter race condition
 *
 * Multiple processes increment a shared counter, causing lost updates
 * due to read-modify-write races.
 *
 * This is the SIMPLEST race condition demonstration.
 */

const COUNTER_FILE = "/tmp/os-demo-counter.json";

interface CounterState {
  value: number;
}

export async function demonstrateCounterRace(): Promise<DemoResult> {
  header("Race Condition Demo: Counter Increment");

  try {
    // Initialize counter
    section("Initializing Shared Counter");
    initializeCounter();
    log("Counter initialized to 0", "success");

    // Spawn worker processes
    section("Spawning Worker Processes");
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
          "src/race-conditions/counter/worker.ts",
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
    section("Race Condition Results");
    const finalState = readCounter();
    const expected = numWorkers * incrementsPerWorker;

    log(`Expected value: ${expected}`, "info");
    log(`Actual value: ${finalState.value}`, "info");
    log(`Lost updates: ${expected - finalState.value}`, "error");

    if (finalState.value < expected) {
      logRace(`RACE CONDITION! Lost ${expected - finalState.value} increments`);
      log(
        "This happened because of concurrent read-modify-write operations",
        "warn"
      );
    } else {
      log("No race detected this time (races are non-deterministic)", "warn");
    }

    cleanup();

    return {
      success: true,
      message: `Counter race condition demonstrated: ${finalState.value}/${expected}`,
      output: `Lost ${expected - finalState.value} updates`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Demo failed: ${errorMsg}`, "error");
    cleanup();
    return {
      success: false,
      message: "Counter race condition demo failed",
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
  demonstrateCounterRace()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
