import { existsSync, unlinkSync, writeFileSync, readFileSync } from "fs";
import { spawn } from "bun";
import { header, log, logRace, section } from "../utils/logger.ts";
import type { DemoResult } from "../utils/types.ts";

/**
 * Demonstrates shared memory using a file as simulated shared memory
 *
 * Multiple processes read and write to the same file, showing:
 * - How shared memory enables data sharing
 * - Race conditions that can occur without synchronization
 * - The need for coordination mechanisms
 */

const SHARED_MEMORY_FILE = "/tmp/os-demo-shared-memory.dat";

interface SharedData {
  counter: number;
  lastWriter: number;
  timestamp: number;
}

export async function demonstrateSharedMemory(): Promise<DemoResult> {
  header("IPC Demo: Shared Memory Simulation");

  try {
    // Initialize shared memory
    section("Initializing Shared Memory");
    initializeSharedMemory();
    log(`Shared memory initialized at ${SHARED_MEMORY_FILE}`, "success");

    // Spawn multiple worker processes
    section("Spawning Multiple Workers");
    const workers: Promise<number | null>[] = [];
    const numWorkers = 3;

    for (let i = 0; i < numWorkers; i++) {
      log(`Spawning worker ${i + 1}...`, "info");
      const worker = spawn({
        cmd: ["bun", "run", "src/ipc/shared-memory-worker.ts", String(i + 1)],
        stderr: "inherit",
        stdout: "inherit",
      });
      workers.push(worker.exited);
    }

    // Wait for all workers to complete
    log(`Waiting for ${numWorkers} workers to complete...`, "info");
    await Promise.all(workers);

    // Read final state
    section("Final State of Shared Memory");
    const finalData = readSharedMemory();
    log(`Final counter value: ${finalData.counter}`, "info");
    log(`Last writer: Process ${finalData.lastWriter}`, "info");
    log(`Last update: ${new Date(finalData.timestamp).toISOString()}`, "info");

    // Calculate expected value
    const incrementsPerWorker = 5;
    const expected = numWorkers * incrementsPerWorker;

    if (finalData.counter < expected) {
      logRace(
        `RACE CONDITION DETECTED! Expected ${expected} but got ${finalData.counter}`
      );
      log("This demonstrates lost updates due to concurrent access", "warn");
    } else {
      log(`All ${expected} increments completed successfully`, "success");
    }

    // Cleanup
    cleanup();

    return {
      success: true,
      message: "Shared memory demonstration completed",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Demo failed: ${errorMsg}`, "error");
    cleanup();
    return {
      success: false,
      message: "Shared memory demonstration failed",
      error: errorMsg,
    };
  }
}

function initializeSharedMemory(): void {
  const initialData: SharedData = {
    counter: 0,
    lastWriter: 0,
    timestamp: Date.now(),
  };
  writeSharedMemory(initialData);
}

function readSharedMemory(): SharedData {
  try {
    const data = readFileSync(SHARED_MEMORY_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return { counter: 0, lastWriter: 0, timestamp: Date.now() };
  }
}

function writeSharedMemory(data: SharedData): void {
  writeFileSync(SHARED_MEMORY_FILE, JSON.stringify(data), "utf8");
}

function cleanup(): void {
  if (existsSync(SHARED_MEMORY_FILE)) {
    unlinkSync(SHARED_MEMORY_FILE);
    log("Cleaned up shared memory file", "info");
  }
}

// Run if executed directly
if (import.meta.main) {
  demonstrateSharedMemory()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
