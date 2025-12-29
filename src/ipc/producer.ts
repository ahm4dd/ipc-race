import { readFileSync, writeFileSync } from "fs";
import { log } from "../utils/logger.ts";

/**
 * Producer process - generates items and adds them to the buffer
 */

const BUFFER_FILE = "/tmp/os-demo-buffer.json";
const MAX_BUFFER_SIZE = 5;

const producerName = process.argv[2] ?? "Producer";
const itemCount = parseInt(process.argv[3] ?? "5");

interface BufferState {
  items: string[];
  producedCount: number;
  consumedCount: number;
}

async function main(): Promise<void> {
  log(`${producerName} started, will produce ${itemCount} items`, "info");

  for (let i = 0; i < itemCount; i++) {
    // Try to produce item
    let produced = false;
    let attempts = 0;

    while (!produced && attempts < 20) {
      const buffer = readBuffer();

      if (buffer.items.length < MAX_BUFFER_SIZE) {
        // Buffer has space, add item
        const item = `Item-${buffer.producedCount + 1}-from-${producerName}`;
        buffer.items.push(item);
        buffer.producedCount++;
        writeBuffer(buffer);

        log(
          `Produced: ${item} (buffer: ${buffer.items.length}/${MAX_BUFFER_SIZE})`,
          "success"
        );
        produced = true;
      } else {
        // Buffer full, wait and retry
        log(
          `Buffer full (${buffer.items.length}/${MAX_BUFFER_SIZE}), waiting...`,
          "warn"
        );
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (!produced) {
      log(
        `Failed to produce item ${i + 1} after ${attempts} attempts`,
        "error"
      );
    }

    // Simulate production time
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 300));
  }

  log(`${producerName} finished producing ${itemCount} items`, "success");
}

function readBuffer(): BufferState {
  const data = readFileSync(BUFFER_FILE, "utf8");
  return JSON.parse(data);
}

function writeBuffer(state: BufferState): void {
  writeFileSync(BUFFER_FILE, JSON.stringify(state, null, 2), "utf8");
}

main().catch((error) => {
  log(
    `${producerName} error: ${
      error instanceof Error ? error.message : String(error)
    }`,
    "error"
  );
  process.exit(1);
});
