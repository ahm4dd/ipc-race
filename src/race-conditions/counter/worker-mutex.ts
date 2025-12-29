import { readFileSync, writeFileSync } from "fs";
import { log } from "../../utils/logger.ts";
import { FileMutex } from "../../solutions/mutex.ts";

/**
 * Worker that increments counter using mutex protection
 * This prevents the race condition by ensuring exclusive access
 */

const COUNTER_FILE = "/tmp/os-demo-counter-solved.json";
const mutex = new FileMutex("counter-mutex");

const workerId = parseInt(process.argv[2] ?? "0");
const incrementCount = parseInt(process.argv[3] ?? "10");

interface CounterState {
  value: number;
}

async function main(): Promise<void> {
  log(`Worker ${workerId} started (mutex-protected)`, "info");

  for (let i = 0; i < incrementCount; i++) {
    // ACQUIRE MUTEX - ensures exclusive access
    const acquired = await mutex.acquire();

    if (!acquired) {
      log(`Worker ${workerId} failed to acquire mutex`, "error");
      continue;
    }

    try {
      // CRITICAL SECTION (protected by mutex)
      const state = readCounter();
      const oldValue = state.value;

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

      state.value = oldValue + 1;
      writeCounter(state);

      // RELEASE MUTEX - allow other processes to access
    } finally {
      mutex.release();
    }

    // Small delay between increments
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
  }

  log(`Worker ${workerId} completed ${incrementCount} increments`, "success");
}

function readCounter(): CounterState {
  const data = readFileSync(COUNTER_FILE, "utf8");
  return JSON.parse(data);
}

function writeCounter(state: CounterState): void {
  writeFileSync(COUNTER_FILE, JSON.stringify(state), "utf8");
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
