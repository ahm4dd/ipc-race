import { readFileSync, writeFileSync } from "fs";
import { log } from "../../utils/logger.ts";

/**
 * Worker that increments a shared counter
 * Demonstrates the read-modify-write race condition
 */

const COUNTER_FILE = "/tmp/os-demo-counter.json";

const workerId = parseInt(process.argv[2] ?? "0");
const incrementCount = parseInt(process.argv[3] ?? "10");

interface CounterState {
  value: number;
}

async function main(): Promise<void> {
  log(
    `Worker ${workerId} started, will increment ${incrementCount} times`,
    "info"
  );

  for (let i = 0; i < incrementCount; i++) {
    // READ the current value
    const state = readCounter();
    const oldValue = state.value;

    // Simulate some processing time (this is where the race happens!)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

    // MODIFY the value
    const newValue = oldValue + 1;

    // WRITE the new value
    state.value = newValue;
    writeCounter(state);

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
