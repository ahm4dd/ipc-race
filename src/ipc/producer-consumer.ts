import { existsSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { spawn } from "bun";
import { header, log, section } from "../utils/logger.ts";
import type { DemoResult } from "../utils/types.ts";

/**
 * Classic Producer-Consumer problem demonstration
 *
 * Multiple producers generate items and add them to a shared buffer.
 * Multiple consumers take items from the buffer and process them.
 *
 * This demonstrates:
 * - Buffer management
 * - Coordination between producers and consumers
 * - Handling buffer overflow/underflow
 */

const BUFFER_FILE = "/tmp/os-demo-buffer.json";
const MAX_BUFFER_SIZE = 5;

interface BufferState {
  items: string[];
  producedCount: number;
  consumedCount: number;
}

export async function demonstrateProducerConsumer(): Promise<DemoResult> {
  header("IPC Demo: Producer-Consumer Pattern");

  try {
    // Initialize buffer
    section("Initializing Shared Buffer");
    initializeBuffer();
    log(`Shared buffer initialized (max size: ${MAX_BUFFER_SIZE})`, "success");

    // Spawn producers and consumers
    section("Starting Producers and Consumers");

    const producer1 = spawn({
      cmd: ["bun", "run", "src/ipc/producer.ts", "Producer-1", "5"],
      stderr: "inherit",
      stdout: "inherit",
    });

    const producer2 = spawn({
      cmd: ["bun", "run", "src/ipc/producer.ts", "Producer-2", "4"],
      stderr: "inherit",
      stdout: "inherit",
    });

    const consumer1 = spawn({
      cmd: ["bun", "run", "src/ipc/consumer.ts", "Consumer-1"],
      stderr: "inherit",
      stdout: "inherit",
    });

    const consumer2 = spawn({
      cmd: ["bun", "run", "src/ipc/consumer.ts", "Consumer-2"],
      stderr: "inherit",
      stdout: "inherit",
    });

    log("2 producers will generate items", "info");
    log("2 consumers will process items", "info");

    // Wait for producers to finish
    await Promise.all([producer1.exited, producer2.exited]);
    log("All producers finished", "success");

    // Give consumers time to drain the buffer
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Terminate consumers (they run continuously)
    consumer1.kill();
    consumer2.kill();

    // Check final state
    section("Final Buffer State");
    const finalState = readBuffer();
    log(`Total produced: ${finalState.producedCount}`, "info");
    log(`Total consumed: ${finalState.consumedCount}`, "info");
    log(`Items remaining in buffer: ${finalState.items.length}`, "info");

    if (finalState.producedCount === finalState.consumedCount) {
      log("All items were successfully processed!", "success");
    } else {
      log(
        `${
          finalState.producedCount - finalState.consumedCount
        } items still in buffer or lost`,
        "warn"
      );
    }

    cleanup();

    return {
      success: true,
      message: "Producer-consumer demonstration completed",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Demo failed: ${errorMsg}`, "error");
    cleanup();
    return {
      success: false,
      message: "Producer-consumer demonstration failed",
      error: errorMsg,
    };
  }
}

function initializeBuffer(): void {
  const initialState: BufferState = {
    items: [],
    producedCount: 0,
    consumedCount: 0,
  };
  writeFileSync(BUFFER_FILE, JSON.stringify(initialState, null, 2), "utf8");
}

function readBuffer(): BufferState {
  try {
    const data = readFileSync(BUFFER_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return { items: [], producedCount: 0, consumedCount: 0 };
  }
}

function cleanup(): void {
  if (existsSync(BUFFER_FILE)) {
    unlinkSync(BUFFER_FILE);
    log("Cleaned up buffer file", "info");
  }
}

// Run if executed directly
if (import.meta.main) {
  demonstrateProducerConsumer()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
