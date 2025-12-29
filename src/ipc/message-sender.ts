import { readFileSync, writeFileSync } from "fs";
import { log } from "../utils/logger.ts";

/**
 * Message sender process - sends messages to the queue
 */

const MESSAGE_QUEUE_FILE = "/tmp/os-demo-message-queue.json";

const processName = process.argv[2] ?? "Unknown";
const messageCount = parseInt(process.argv[3] ?? "1");

interface Message {
  id: number;
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

async function main(): Promise<void> {
  log(`${processName} started, will send ${messageCount} messages`, "info");

  for (let i = 0; i < messageCount; i++) {
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 500));

    const message: Message = {
      id: Date.now() + Math.random(),
      from: processName,
      to: "Receiver",
      content: `Message #${i + 1} from ${processName}`,
      timestamp: Date.now(),
    };

    sendMessage(message);
    log(`Sent: "${message.content}"`, "success");
  }

  log(`${processName} finished sending ${messageCount} messages`, "success");
}

function sendMessage(message: Message): void {
  // Read current queue
  const queue = readQueue();

  // Add new message
  queue.push(message);

  // Write back
  writeFileSync(MESSAGE_QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");
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
