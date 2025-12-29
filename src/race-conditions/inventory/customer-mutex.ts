import { readFileSync, writeFileSync } from "fs";
import { log } from "../../utils/logger.ts";
import { FileMutex } from "../../solutions/mutex.ts";
import type { InventoryItem } from "../../utils/types.ts";

/**
 * Customer process WITH mutex protection
 * Ensures atomic check-and-purchase operation
 */

const INVENTORY_FILE = "/tmp/os-demo-inventory-solved.json";
const mutex = new FileMutex("inventory-mutex");

const productName = process.argv[2] ?? "Laptop";
const quantity = parseInt(process.argv[3] ?? "1");
const customerName = process.argv[4] ?? "Customer";

interface InventoryState {
  items: InventoryItem[];
}

async function main(): Promise<void> {
  log(
    `${customerName} attempting to purchase ${quantity} ${productName}(s) (mutex-protected)`,
    "info"
  );

  // ACQUIRE MUTEX - ensures exclusive access to inventory
  const acquired = await mutex.acquire();

  if (!acquired) {
    log(`${customerName}: Failed to acquire mutex`, "error");
    process.exit(1);
  }

  try {
    // CRITICAL SECTION - check and purchase atomically

    // Small delay (customer arrival time)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

    const state = readInventory();
    const item = state.items.find((i) => i.product === productName);

    if (!item) {
      log(`${customerName}: Product ${productName} not found`, "error");
      return;
    }

    log(`${customerName}: Current stock: ${item.quantity}`, "info");

    if (item.quantity >= quantity) {
      log(
        `${customerName}: Stock available, processing purchase...`,
        "success"
      );

      // Simulate order processing
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 150));

      item.quantity -= quantity;
      writeInventory(state);

      log(
        `${customerName}: Purchase successful! Remaining stock: ${item.quantity}`,
        "success"
      );
    } else {
      log(
        `${customerName}: Out of stock. Available: ${item.quantity}, Requested: ${quantity}`,
        "warn"
      );
      log(`${customerName}: Purchase rejected to prevent overselling`, "warn");
    }
  } finally {
    // RELEASE MUTEX - allow other customers to access inventory
    mutex.release();
  }
}

function readInventory(): InventoryState {
  const data = readFileSync(INVENTORY_FILE, "utf8");
  return JSON.parse(data);
}

function writeInventory(state: InventoryState): void {
  writeFileSync(INVENTORY_FILE, JSON.stringify(state, null, 2), "utf8");
}

main().catch((error) => {
  log(
    `${customerName} error: ${
      error instanceof Error ? error.message : String(error)
    }`,
    "error"
  );
  mutex.release();
  process.exit(1);
});
