import { readFileSync, writeFileSync } from "fs";
import { log, logRace } from "../utils/logger.ts";

/**
 * Worker process that accesses shared memory
 * Demonstrates race conditions from concurrent access
 */

const SHARED_MEMORY_FILE = "/tmp/os-demo-shared-memory.dat";
const workerId = parseInt(process.argv[2] ?? "0");

interface SharedData {
  counter: number;
  lastWriter: number;
  timestamp: number;
}

async function main(): Promise<void> {
  log(`Worker ${workerId} started`, "info");

  const incrementCount = 5;

  for (let i = 0; i < incrementCount; i++) {
    // Simulate doing some work before accessing shared memory
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

    // READ from shared memory
    const data = readSharedMemory();
    log(`Worker ${workerId} read counter: ${data.counter}`, "info");

    const oldValue = data.counter;

    // Simulate some processing time (this is where races can happen!)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 30));

    // MODIFY the value
    data.counter += 1;
    data.lastWriter = workerId;
    data.timestamp = Date.now();

    // WRITE back to shared memory
    writeSharedMemory(data);
    log(
      `Worker ${workerId} incremented counter: ${oldValue} → ${data.counter}`,
      "success"
    );

    // Verify the write (might have been overwritten already!)
    await new Promise((resolve) => setTimeout(resolve, 10));
    const verification = readSharedMemory();
    if (verification.counter !== data.counter) {
      logRace(
        `Worker ${workerId} detected race! Wrote ${data.counter} but now it's ${verification.counter}`
      );
    }
  }

  log(`Worker ${workerId} completed ${incrementCount} increments`, "success");
}

function readSharedMemory(): SharedData {
  const data = readFileSync(SHARED_MEMORY_FILE, "utf8");
  return JSON.parse(data);
}

function writeSharedMemory(data: SharedData): void {
  writeFileSync(SHARED_MEMORY_FILE, JSON.stringify(data), "utf8");
}

main().catch((error) => {
  log(
    `Worker ${workerId} error: ${
      error instanceof Error ? error.message : String(error)
    }`,
    "error"
  );
  process.exit(1);
});
