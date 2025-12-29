import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawn } from "bun";
import { header, log, logRace, section } from "../../utils/logger.ts";
import type { DemoResult, InventoryItem } from "../../utils/types.ts";

/**
 * Demonstrates race condition in inventory management
 *
 * Multiple customers attempt to purchase the same limited-stock item,
 * potentially causing overselling (negative stock).
 */

const INVENTORY_FILE = "/tmp/os-demo-inventory.json";
const INITIAL_STOCK = 10;

interface InventoryState {
  items: InventoryItem[];
}

export async function demonstrateInventoryRace(): Promise<DemoResult> {
  header("Race Condition Demo: Inventory Management");

  try {
    // Initialize inventory
    section("Initializing Inventory");
    initializeInventory();
    log(`Product "Laptop" initialized with stock: ${INITIAL_STOCK}`, "success");

    // Spawn concurrent purchase processes
    section("Spawning Concurrent Purchase Processes");
    const numCustomers = 15;
    const purchaseQuantity = 1;

    log(
      `${numCustomers} customers will try to purchase ${purchaseQuantity} laptop(s) each`,
      "info"
    );
    log(`Available stock: ${INITIAL_STOCK}`, "info");
    log(`Total purchase attempts: ${numCustomers * purchaseQuantity}`, "info");
    log(
      `Should reject ${
        numCustomers - INITIAL_STOCK
      } purchases to prevent overselling`,
      "warn"
    );

    const workers: Promise<number | null>[] = [];

    for (let i = 0; i < numCustomers; i++) {
      const worker = spawn({
        cmd: [
          "bun",
          "run",
          "src/race-conditions/inventory/customer.ts",
          "Laptop",
          String(purchaseQuantity),
          `Customer-${i + 1}`,
        ],
        stderr: "inherit",
        stdout: "inherit",
      });
      workers.push(worker.exited);

      // Stagger the starts slightly to increase race likelihood
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Wait for all customers
    await Promise.all(workers);

    // Check final state
    section("Race Condition Results");
    const finalState = readInventory();
    const laptop = finalState.items.find((item) => item.product === "Laptop");

    if (!laptop) {
      throw new Error("Laptop not found in inventory");
    }

    log(`Final stock: ${laptop.quantity}`, "info");
    log(`Expected minimum: 0 (cannot go negative)`, "info");

    if (laptop.quantity < 0) {
      logRace(`OVERSELLING DETECTED! Stock is negative: ${laptop.quantity}`);
      log("This means we sold items we don't have!", "error");
      log(`Oversold by: ${Math.abs(laptop.quantity)} units`, "error");
    } else if (laptop.quantity === 0) {
      log("All stock sold out correctly", "success");
    } else {
      log(`${laptop.quantity} units remaining`, "info");
      const sold = INITIAL_STOCK - laptop.quantity;
      log(`Successfully sold: ${sold} units`, "info");
    }

    cleanup();

    return {
      success: true,
      message: `Inventory race demo: final stock ${laptop.quantity}`,
      output:
        laptop.quantity < 0
          ? `OVERSOLD by ${Math.abs(laptop.quantity)}!`
          : "Check logs",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Demo failed: ${errorMsg}`, "error");
    cleanup();
    return {
      success: false,
      message: "Inventory race demo failed",
      error: errorMsg,
    };
  }
}

function initializeInventory(): void {
  const initialState: InventoryState = {
    items: [{ id: 1, product: "Laptop", quantity: INITIAL_STOCK }],
  };
  writeFileSync(INVENTORY_FILE, JSON.stringify(initialState, null, 2), "utf8");
}

function readInventory(): InventoryState {
  try {
    const data = readFileSync(INVENTORY_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return { items: [] };
  }
}

function cleanup(): void {
  if (existsSync(INVENTORY_FILE)) {
    try {
      const fs = require("fs");
      fs.unlinkSync(INVENTORY_FILE);
      log("Cleaned up inventory file", "info");
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  demonstrateInventoryRace()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
