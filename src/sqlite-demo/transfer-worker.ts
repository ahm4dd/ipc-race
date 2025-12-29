import { Database } from "bun:sqlite";
import { log } from "../utils/logger.ts";

/**
 * Worker that performs money transfer WITHOUT transaction protection
 * This causes race conditions in the database
 */

const DB_PATH = "/tmp/os-demo-race.db";

const fromAccount = process.argv[2] ?? "Alice";
const toAccount = process.argv[3] ?? "Bob";
const amount = parseInt(process.argv[4] ?? "100");

async function main(): Promise<void> {
  log(`Transferring $${amount} from ${fromAccount} to ${toAccount}`, "info");

  const db = new Database(DB_PATH);

  try {
    // NO TRANSACTION - This is where the race happens!

    // Step 1: Read source balance
    const fromRow = db
      .query("SELECT balance FROM accounts WHERE name = ?")
      .get(fromAccount) as any;

    if (!fromRow) {
      log(`Account ${fromAccount} not found`, "error");
      process.exit(1);
    }

    const fromBalance = fromRow.balance;
    log(`${fromAccount} balance: $${fromBalance}`, "info");

    // Simulate processing delay (this is where races happen!)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

    if (fromBalance < amount) {
      log(`Insufficient funds in ${fromAccount}`, "warn");
      process.exit(0);
    }

    // Step 2: Read destination balance
    const toRow = db
      .query("SELECT balance FROM accounts WHERE name = ?")
      .get(toAccount) as any;
    const toBalance = toRow.balance;

    // Simulate more processing
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

    // Step 3: Update source (deduct)
    db.run("UPDATE accounts SET balance = ? WHERE name = ?", [
      fromBalance - amount,
      fromAccount,
    ]);
    log(`Deducted $${amount} from ${fromAccount}`, "success");

    // Simulate delay between updates
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

    // Step 4: Update destination (add)
    db.run("UPDATE accounts SET balance = ? WHERE name = ?", [
      toBalance + amount,
      toAccount,
    ]);
    log(`Added $${amount} to ${toAccount}`, "success");

    log("Transfer completed", "success");
  } catch (error) {
    log(
      `Transfer error: ${
        error instanceof Error ? error.message : String(error)
      }`,
      "error"
    );
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
