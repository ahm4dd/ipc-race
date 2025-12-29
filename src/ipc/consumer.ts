import { readFileSync, writeFileSync } from "fs";
import { log } from "../utils/logger.ts";

/**
 * Consumer process - takes items from buffer and processes them
 */

const BUFFER_FILE = "/tmp/os-demo-buffer.json";

const consumerName = process.argv[2] ?? "Consumer";

interface BufferState {
  items: string[];
  producedCount: number;
  consumedCount: number;
}

async function main(): Promise<void> {
  log(`${consumerName} started, waiting for items...`, "info");

  let emptyCount = 0;
  const maxEmptyWait = 5;

  while (true) {
    const buffer = readBuffer();

    if (buffer.items.length > 0) {
      // Buffer has items, consume one
      const item = buffer.items.shift();
      if (item) {
        buffer.consumedCount++;
        writeBuffer(buffer);

        log(
          `Consumed: ${item} (buffer: ${buffer.items.length} remaining)`,
          "success"
        );
        emptyCount = 0; // Reset empty counter

        // Simulate processing time
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 400)
        );
      }
    } else {
      // Buffer empty, wait a bit
      emptyCount++;
      if (emptyCount >= maxEmptyWait) {
        log(`Buffer empty for ${emptyCount} checks, shutting down`, "info");
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  const finalBuffer = readBuffer();
  log(
    `${consumerName} finished, consumed ${finalBuffer.consumedCount} total items`,
    "success"
  );
}

function readBuffer(): BufferState {
  try {
    const data = readFileSync(BUFFER_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return { items: [], producedCount: 0, consumedCount: 0 };
  }
}

function writeBuffer(state: BufferState): void {
  writeFileSync(BUFFER_FILE, JSON.stringify(state, null, 2), "utf8");
}

main().catch((error) => {
  log(
    `${consumerName} error: ${
      error instanceof Error ? error.message : String(error)
    }`,
    "error"
  );
  process.exit(1);
});
