import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";

/**
 * Simple file-based mutex implementation for process synchronization
 *
 * This is a basic mutex using filesystem atomicity guarantees.
 * In production, you'd use proper IPC mechanisms or database locks.
 */

export class FileMutex {
  private lockFile: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor(name: string, maxRetries = 100, retryDelay = 10) {
    this.lockFile = `/tmp/${name}.lock`;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  async acquire(): Promise<boolean> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Try to create lock file exclusively
        if (!existsSync(this.lockFile)) {
          writeFileSync(this.lockFile, String(process.pid), { flag: "wx" });
          return true;
        }

        // Lock exists, wait and retry
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      } catch (error) {
        // File might have been created by another process, retry
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      }
    }

    return false; // Failed to acquire lock
  }

  release(): void {
    try {
      if (existsSync(this.lockFile)) {
        const lockOwner = readFileSync(this.lockFile, "utf8");
        if (lockOwner === String(process.pid)) {
          unlinkSync(this.lockFile);
        }
      }
    } catch {
      // Ignore errors during release
    }
  }

  cleanup(): void {
    try {
      if (existsSync(this.lockFile)) {
        unlinkSync(this.lockFile);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
