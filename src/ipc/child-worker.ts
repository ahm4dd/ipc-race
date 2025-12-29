import { log, section } from "../utils/logger.ts";
import type { IPCMessage } from "../utils/types.ts";

/**
 * Child process that receives tasks from parent and returns results
 */

const parentMessages: string[] = [];

process.stdin.setEncoding("utf8");

process.stdin.on("data", (data: string) => {
  const lines = data.trim().split("\n");

  for (const line of lines) {
    if (!line) continue;

    try {
      const message: IPCMessage = JSON.parse(line);
      parentMessages.push(line);

      log(`Received from parent: ${message.type}`, "info");

      switch (message.type) {
        case "TASK":
          handleTask(message);
          break;
        case "PING":
          handlePing(message);
          break;
        case "EXIT":
          handleExit();
          break;
        default:
          log(`Unknown message type: ${message.type}`, "warn");
      }
    } catch (error) {
      log(
        `Failed to parse message: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
    }
  }
});

function handleTask(message: IPCMessage): void {
  const task = message.payload as { operation: string; value: number };
  log(`Processing task: ${task.operation} on ${task.value}`, "info");

  // Simulate some work
  const result =
    task.operation === "square" ? task.value * task.value : task.value * 2;

  sendToParent({
    type: "RESULT",
    payload: { original: task.value, result, operation: task.operation },
    timestamp: Date.now(),
    processId: process.pid,
  });

  log(`Task completed: ${result}`, "success");
}

function handlePing(message: IPCMessage): void {
  log("Received PING, sending PONG", "info");
  sendToParent({
    type: "PONG",
    payload: { receivedAt: message.timestamp, respondedAt: Date.now() },
    timestamp: Date.now(),
    processId: process.pid,
  });
}

function handleExit(): void {
  log("Received EXIT signal, shutting down gracefully", "warn");
  sendToParent({
    type: "GOODBYE",
    payload: { messagesProcessed: parentMessages.length },
    timestamp: Date.now(),
    processId: process.pid,
  });
  process.exit(0);
}

function sendToParent(message: IPCMessage): void {
  process.stdout.write(JSON.stringify(message) + "\n");
}

log("Child process started and waiting for messages", "success");
