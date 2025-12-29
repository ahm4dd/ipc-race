import { readFileSync, writeFileSync } from "fs";
import { log } from "../utils/logger.ts";

/**
 * Message receiver process - consumes messages from the queue
 */

const MESSAGE_QUEUE_FILE = "/tmp/os-demo-message-queue.json";

const processName = process.argv[2] ?? "Receiver";
const maxMessages = parseInt(process.argv[3] ?? "10");

interface Message {
  id: number;
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

async function main(): Promise<void> {
  log(
    `${processName} started, will consume up to ${maxMessages} messages`,
    "info"
  );

  let receivedCount = 0;

  while (receivedCount < maxMessages) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const message = receiveMessage();

    if (message) {
      receivedCount++;
      const latency = Date.now() - message.timestamp;
      log(
        `Received from ${message.from}: "${message.content}" (latency: ${latency}ms)`,
        "success"
      );
    } else {
      // No messages in queue, check if we should keep waiting
      if (receivedCount === 0) {
        // Haven't received anything yet, keep waiting
        continue;
      } else {
        // Already received some messages, give it a bit more time
        await new Promise((resolve) => setTimeout(resolve, 500));
        const finalCheck = receiveMessage();
        if (!finalCheck) {
          log("No more messages in queue, shutting down", "info");
          break;
        } else {
          receivedCount++;
          const latency = Date.now() - finalCheck.timestamp;
          log(
            `Received from ${finalCheck.from}: "${finalCheck.content}" (latency: ${latency}ms)`,
            "success"
          );
        }
      }
    }
  }

  log(`${processName} finished, consumed ${receivedCount} messages`, "success");
}

function receiveMessage(): Message | null {
  // Read queue
  const queue = readQueue();

  if (queue.length === 0) {
    return null;
  }

  // Dequeue first message (FIFO)
  const message = queue.shift();

  // Write back updated queue
  writeFileSync(MESSAGE_QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");

  return message ?? null;
}

function readQueue(): Message[] {
  try {
    const data = readFileSync(MESSAGE_QUEUE_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

main().catch((error) => {
  log(
    `${processName} error: ${
      error instanceof Error ? error.message : String(error)
    }`,
    "error"
  );
  process.exit(1);
});
