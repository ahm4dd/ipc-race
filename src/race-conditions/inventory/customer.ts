import { readFileSync, writeFileSync } from "fs";
import { log, logRace } from "../../utils/logger.ts";
import type { InventoryItem } from "../../utils/types.ts";

/**
 * Customer process that attempts to purchase from inventory
 * WITHOUT proper race condition protection
 */

const INVENTORY_FILE = "/tmp/os-demo-inventory.json";

const productName = process.argv[2] ?? "Laptop";
const quantity = parseInt(process.argv[3] ?? "1");
const customerName = process.argv[4] ?? "Customer";

interface InventoryState {
  items: InventoryItem[];
}

async function main(): Promise<void> {
  log(
    `${customerName} attempting to purchase ${quantity} ${productName}(s)`,
    "info"
  );

  // Small random delay (customers arrive at different times)
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

  // READ the inventory
  const state = readInventory();
  const item = state.items.find((i) => i.product === productName);

  if (!item) {
    log(`${customerName}: Product ${productName} not found`, "error");
    process.exit(1);
  }

  log(`${customerName}: Current stock: ${item.quantity}`, "info");

  // CHECK if enough stock (this is where the race happens!)
  if (item.quantity >= quantity) {
    log(`${customerName}: Stock available, processing purchase...`, "success");

    // Simulate order processing time (payment, verification, packaging)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 150));

    // MODIFY the stock
    item.quantity -= quantity;

    // WRITE back the updated inventory
    writeInventory(state);

    log(
      `${customerName}: Purchase successful! Remaining stock: ${item.quantity}`,
      "success"
    );

    // Check if we caused negative stock
    if (item.quantity < 0) {
      logRace(
        `${customerName} caused overselling! Stock is now ${item.quantity}`
      );
    }
  } else {
    log(
      `${customerName}: Out of stock. Available: ${item.quantity}, Requested: ${quantity}`,
      "warn"
    );
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
  process.exit(1);
});
