import {
  existsSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  appendFileSync,
} from "fs";
import { header, log, section } from "../utils/logger.ts";
import type { DemoResult } from "../utils/types.ts";
import { spawn } from "bun";

/**
 * Demonstrates message passing between independent processes using a message queue file
 *
 * This shows asynchronous, decoupled communication where processes don't need to
 * know about each other - they just read/write messages to a shared queue.
 */

const MESSAGE_QUEUE_FILE = "/tmp/os-demo-message-queue.json";

interface Message {
  id: number;
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

export async function demonstrateMessagePassing(): Promise<DemoResult> {
  header("IPC Demo: Message Passing");

  try {
    // Initialize message queue
    section("Initializing Message Queue");
    initializeQueue();
    log(`Message queue created at ${MESSAGE_QUEUE_FILE}`, "success");

    // Spawn sender and receiver processes
    section("Starting Sender and Receiver Processes");

    const sender1 = spawn({
      cmd: ["bun", "run", "src/ipc/message-sender.ts", "Sender-A", "3"],
      stderr: "inherit",
      stdout: "inherit",
    });

    const sender2 = spawn({
      cmd: ["bun", "run", "src/ipc/message-sender.ts", "Sender-B", "2"],
      stderr: "inherit",
      stdout: "inherit",
    });

    const receiver = spawn({
      cmd: ["bun", "run", "src/ipc/message-receiver.ts", "Receiver", "5"],
      stderr: "inherit",
      stdout: "inherit",
    });

    log("Sender-A and Sender-B will send messages", "info");
    log("Receiver will consume messages from the queue", "info");

    // Wait for all processes to complete
    await Promise.all([sender1.exited, sender2.exited, receiver.exited]);

    // Check final queue state
    section("Final Queue State");
    const finalMessages = readQueue();
    if (finalMessages.length === 0) {
      log("All messages were consumed successfully", "success");
    } else {
      log(`${finalMessages.length} messages remaining in queue`, "info");
    }

    cleanup();

    return {
      success: true,
      message: "Message passing demonstration completed",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Demo failed: ${errorMsg}`, "error");
    cleanup();
    return {
      success: false,
      message: "Message passing demonstration failed",
      error: errorMsg,
    };
  }
}

function initializeQueue(): void {
  writeFileSync(MESSAGE_QUEUE_FILE, JSON.stringify([]), "utf8");
}

function readQueue(): Message[] {
  try {
    const data = readFileSync(MESSAGE_QUEUE_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function cleanup(): void {
  if (existsSync(MESSAGE_QUEUE_FILE)) {
    unlinkSync(MESSAGE_QUEUE_FILE);
    log("Cleaned up message queue file", "info");
  }
}

// Run if executed directly
if (import.meta.main) {
  demonstrateMessagePassing()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
