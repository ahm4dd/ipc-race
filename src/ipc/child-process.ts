import { spawn } from "bun";
import { header, log, section } from "../utils/logger.ts";
import type { IPCMessage, DemoResult } from "../utils/types.ts";

/**
 * Demonstrates parent-child process communication using stdin/stdout
 *
 * This shows how processes can coordinate work by passing messages
 * between parent and child processes.
 */

export async function demonstrateChildProcess(): Promise<DemoResult> {
  header("IPC Demo: Child Process Communication");

  try {
    log("Spawning child process...", "info");

    const child = spawn({
      cmd: ["bun", "run", "src/ipc/child-worker.ts"],
      stdout: "pipe",
      stdin: "pipe",
      stderr: "inherit",
    });

    if (!child.stdin || !child.stdout) {
      throw new Error("Failed to create child process pipes");
    }

    // Set up output handling
    let childOutput = "";
    const decoder = new TextDecoder();

    // Read child output in chunks
    const outputReader = async () => {
      for await (const chunk of child.stdout) {
        const text = decoder.decode(chunk);
        childOutput += text;

        // Process complete messages
        const lines = text.trim().split("\n");
        for (const line of lines) {
          if (!line) continue;
          try {
            const message: IPCMessage = JSON.parse(line);
            log(
              `Received from child: ${message.type} - ${JSON.stringify(
                message.payload
              )}`,
              "success"
            );
          } catch {
            // Not a complete JSON message yet
          }
        }
      }
    };

    // Start reading output asynchronously
    const outputPromise = outputReader();

    section("Parent-Child Communication");

    // Send PING message
    log("Sending PING to child...", "info");
    sendMessage(child.stdin, {
      type: "PING",
      payload: {},
      timestamp: Date.now(),
      processId: process.pid,
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Send multiple tasks
    section("Sending Tasks to Child");
    const tasks = [
      { operation: "square", value: 5 },
      { operation: "double", value: 10 },
      { operation: "square", value: 3 },
    ];

    for (const task of tasks) {
      log(`Sending task: ${task.operation}(${task.value})`, "info");
      sendMessage(child.stdin, {
        type: "TASK",
        payload: task,
        timestamp: Date.now(),
        processId: process.pid,
      });
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Send EXIT signal
    section("Shutting Down");
    log("Sending EXIT signal to child...", "info");
    sendMessage(child.stdin, {
      type: "EXIT",
      payload: {},
      timestamp: Date.now(),
      processId: process.pid,
    });

    // Wait for child to exit
    const exitCode = await child.exited;

    // Wait for all output to be read
    await outputPromise;

    log(`Child process exited with code ${exitCode}`, "success");

    return {
      success: true,
      message: "Child process communication demo completed successfully",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Demo failed: ${errorMsg}`, "error");
    return {
      success: false,
      message: "Child process communication demo failed",
      error: errorMsg,
    };
  }
}

function sendMessage(
  stdin: typeof import("bun").Subprocess.prototype.stdin,
  message: IPCMessage
): void {
  if (!stdin) return;
  const data = JSON.stringify(message) + "\n";
  stdin.write(data);
}

// Run if executed directly
if (import.meta.main) {
  demonstrateChildProcess()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
