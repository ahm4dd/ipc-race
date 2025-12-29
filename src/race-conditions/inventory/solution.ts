import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawn } from "bun";
import { header, log, section } from "../../utils/logger.ts";
import type { DemoResult, InventoryItem } from "../../utils/types.ts";

/**
 * Inventory management SOLVED using mutex
 *
 * The mutex ensures that stock checking and purchasing happen atomically,
 * preventing overselling.
 */

const INVENTORY_FILE = "/tmp/os-demo-inventory-solved.json";
const INITIAL_STOCK = 10;

interface InventoryState {
  items: InventoryItem[];
}

export async function demonstrateInventorySolution(): Promise<DemoResult> {
  header("Race Solution: Inventory with Mutex Protection");

  try {
    // Initialize inventory
    section("Initializing Inventory");
    initializeInventory();
    log(`Product "Laptop" initialized with stock: ${INITIAL_STOCK}`, "success");

    // Spawn concurrent purchase processes (with mutex)
    section("Spawning Purchase Processes (Mutex Protected)");
    const numCustomers = 15;
    const purchaseQuantity = 1;

    log(
      `${numCustomers} customers will try to purchase ${purchaseQuantity} laptop(s) each`,
      "info"
    );
    log(`Available stock: ${INITIAL_STOCK}`, "info");
    log(
      `With mutex: only ${INITIAL_STOCK} can succeed, ${
        numCustomers - INITIAL_STOCK
      } will be rejected`,
      "info"
    );

    const workers: Promise<number | null>[] = [];

    for (let i = 0; i < numCustomers; i++) {
      const worker = spawn({
        cmd: [
          "bun",
          "run",
          "src/race-conditions/inventory/customer-mutex.ts",
          "Laptop",
          String(purchaseQuantity),
          `Customer-${i + 1}`,
        ],
        stderr: "inherit",
        stdout: "inherit",
      });
      workers.push(worker.exited);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Wait for all customers
    await Promise.all(workers);

    // Check final state
    section("Solution Results");
    const finalState = readInventory();
    const laptop = finalState.items.find((item) => item.product === "Laptop");

    if (!laptop) {
      throw new Error("Laptop not found in inventory");
    }

    log(`Final stock: ${laptop.quantity}`, "info");
    const sold = INITIAL_STOCK - laptop.quantity;

    if (laptop.quantity >= 0) {
      log("SUCCESS! Stock never went negative", "success");
      log("Mutex ensured atomic check-and-purchase operations", "success");
      log(`Correctly sold: ${sold} units`, "success");
      log(`Correctly rejected: ${numCustomers - sold} purchases`, "success");
    } else {
      log(`Failed: negative stock ${laptop.quantity}`, "error");
    }

    cleanup();

    return {
      success: true,
      message: `Inventory solution: ${sold} sold, ${laptop.quantity} remaining (mutex protected)`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Demo failed: ${errorMsg}`, "error");
    cleanup();
    return {
      success: false,
      message: "Inventory solution failed",
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
  demonstrateInventorySolution()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
