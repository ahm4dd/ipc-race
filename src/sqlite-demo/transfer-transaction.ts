import { Database } from "bun:sqlite";
import { log } from "../utils/logger.ts";

/**
 * Worker that performs money transfer WITH transaction protection
 * Ensures ACID properties for database operations
 */

const DB_PATH = "/tmp/os-demo-transaction.db";

const fromAccount = process.argv[2] ?? "Alice";
const toAccount = process.argv[3] ?? "Bob";
const amount = parseInt(process.argv[4] ?? "100");

async function main(): Promise<void> {
  log(
    `Transferring $${amount} from ${fromAccount} to ${toAccount} (with transaction)`,
    "info"
  );

  const db = new Database(DB_PATH);

  try {
    // BEGIN TRANSACTION - Ensures atomicity and isolation
    db.run("BEGIN TRANSACTION");

    log("Transaction started", "info");

    // Step 1: Read source balance (within transaction)
    const fromRow = db
      .query("SELECT balance FROM accounts WHERE name = ?")
      .get(fromAccount) as any;

    if (!fromRow) {
      log(`Account ${fromAccount} not found`, "error");
      db.run("ROLLBACK");
      process.exit(1);
    }

    const fromBalance = fromRow.balance;
    log(`${fromAccount} balance: $${fromBalance}`, "info");

    // Check for sufficient funds
    if (fromBalance < amount) {
      log(`Insufficient funds in ${fromAccount}`, "warn");
      db.run("ROLLBACK");
      log("Transaction rolled back", "warn");
      process.exit(0);
    }

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

    // Step 2: Update source account (within transaction)
    db.run("UPDATE accounts SET balance = balance - ? WHERE name = ?", [
      amount,
      fromAccount,
    ]);
    log(`Deducted $${amount} from ${fromAccount}`, "success");

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

    // Step 3: Update destination account (within transaction)
    db.run("UPDATE accounts SET balance = balance + ? WHERE name = ?", [
      amount,
      toAccount,
    ]);
    log(`Added $${amount} to ${toAccount}`, "success");

    // COMMIT TRANSACTION - Makes all changes permanent atomically
    db.run("COMMIT");
    log("Transaction committed successfully", "success");
  } catch (error) {
    // ROLLBACK on error - Undoes all changes
    log(
      `Transfer error: ${
        error instanceof Error ? error.message : String(error)
      }`,
      "error"
    );
    try {
      db.run("ROLLBACK");
      log("Transaction rolled back due to error", "warn");
    } catch {
      // Ignore rollback errors
    }
  } finally {
    db.close();
  }
}

main().catch((error) => {
  log(
    `Worker error: ${error instanceof Error ? error.message : String(error)}`,
    "error"
  );
  process.exit(1);
});
