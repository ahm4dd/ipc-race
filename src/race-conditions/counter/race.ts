import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawn } from "bun";
import { header, log, logRace, section } from "../../utils/logger.ts";
import type { DemoResult } from "../../utils/types.ts";
import chalk from "chalk";

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

    // VISUAL PROOF: Show initial file content
    log("📄 File contents BEFORE:", "info");
    console.log(chalk.gray(readFileSync(COUNTER_FILE, "utf8")));

    // Spawn worker processes
    section("Spawning Worker Processes");
    const numWorkers = 5;
    const incrementsPerWorker = 20;
    const expected = numWorkers * incrementsPerWorker;

    log(
      `Spawning ${numWorkers} workers, each will increment ${incrementsPerWorker} times`,
      "info"
    );
    log(`Expected increments: ${expected}`, "info");

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

    // VISUAL PROOF: Show final file content
    log("📄 File contents AFTER:", "info");
    console.log(chalk.gray(readFileSync(COUNTER_FILE, "utf8")));

    const finalState = readCounter();
    const actual = finalState.value;
    const lost = expected - actual;

    // VERIFICATION TABLE
    console.log("\n" + chalk.cyan("╔════════════════════════════════════╗"));
    console.log(chalk.cyan("║  VERIFICATION SUMMARY              ║"));
    console.log(chalk.cyan("╠════════════════════════════════════╣"));
    console.log(
      chalk.cyan("║") +
        ` Expected:      ${String(expected).padEnd(20)} ` +
        chalk.cyan("║")
    );
    console.log(
      chalk.cyan("║") +
        ` Actual:        ${String(actual).padEnd(20)} ` +
        chalk.cyan("║")
    );
    const lostStr = `${lost} ${lost > 0 ? "⚠️" : ""}`;
    console.log(
      chalk.cyan("║") +
        ` Lost Updates:  ${lostStr.padEnd(20)} ` +
        chalk.cyan("║")
    );
    console.log(chalk.cyan("╚════════════════════════════════════╝") + "\n");

    if (actual < expected) {
      logRace(`RACE CONDITION DETECTED! Lost ${lost} increments`);
      log("The file proves that increments were overwritten!", "warn");
    } else {
      log("No race detected this time (races are non-deterministic)", "warn");
    }

    cleanup();

    return {
      success: true,
      message: `Counter race demonstrated: ${actual}/${expected}`,
      output: `Lost ${lost} updates`,
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
  writeFileSync(COUNTER_FILE, JSON.stringify(initialState, null, 2), "utf8");
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
