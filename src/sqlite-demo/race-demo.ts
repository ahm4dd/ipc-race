import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { spawn } from "bun";
import { header, log, logRace, section } from "../utils/logger.ts";
import type { DemoResult } from "../utils/types.ts";

/**
 * Demonstrates race conditions in SQLite WITHOUT proper transactions
 *
 * Multiple processes perform concurrent database operations, causing:
 * - Lost updates
 * - Dirty reads
 * - Non-repeatable reads
 * - Data inconsistencies
 */

const DB_PATH = "/tmp/os-demo-race.db";

export async function demonstrateSQLiteRace(): Promise<DemoResult> {
  header("SQLite Race Condition Demo: Without Transactions");

  try {
    // Initialize database
    section("Initializing Database");
    const db = initializeDatabase();
    log("Database created with initial data", "success");

    // Show initial state
    const initialAccounts = db.query("SELECT * FROM accounts").all();
    log("Initial accounts:", "info");
    for (const account of initialAccounts as any[]) {
      log(`  ${account.name}: $${account.balance}`, "info");
    }
    db.close();

    // Spawn concurrent transfer processes
    section("Spawning Concurrent Transfer Processes");
    const numProcesses = 5;

    log(
      `${numProcesses} processes will transfer $100 from Alice to Bob`,
      "info"
    );
    log("Without transactions, this will cause race conditions!", "warn");

    const workers: Promise<number | null>[] = [];

    for (let i = 0; i < numProcesses; i++) {
      const worker = spawn({
        cmd: [
          "bun",
          "run",
          "src/sqlite-demo/transfer-worker.ts",
          "Alice",
          "Bob",
          "100",
        ],
        stderr: "inherit",
        stdout: "inherit",
      });
      workers.push(worker.exited);
    }

    // Wait for all processes
    await Promise.all(workers);

    // Check final state
    section("Race Condition Results");
    const finalDb = new Database(DB_PATH);
    const finalAccounts = finalDb.query("SELECT * FROM accounts").all();

    log("Final accounts:", "info");
    let aliceBalance = 0;
    let bobBalance = 0;

    for (const account of finalAccounts as any[]) {
      log(`  ${account.name}: $${account.balance}`, "info");
      if (account.name === "Alice") aliceBalance = account.balance;
      if (account.name === "Bob") bobBalance = account.balance;
    }

    // Analysis
    const expectedAlice = 1000 - numProcesses * 100;
    const expectedBob = 1000 + numProcesses * 100;

    log("\nExpected results:", "info");
    log(`  Alice: $${expectedAlice}`, "info");
    log(`  Bob: $${expectedBob}`, "info");

    if (aliceBalance !== expectedAlice || bobBalance !== expectedBob) {
      logRace("RACE CONDITION DETECTED!");
      log(`Alice difference: $${aliceBalance - expectedAlice}`, "error");
      log(`Bob difference: $${bobBalance - expectedBob}`, "error");

      const totalMoney = aliceBalance + bobBalance;
      const expectedTotal = 1000 + 1000; // Initial balances
      if (totalMoney !== expectedTotal) {
        logRace(
          `Money disappeared! Total: $${totalMoney}, Expected: $${expectedTotal}`
        );
      }
    } else {
      log("No race detected this time (races are non-deterministic)", "warn");
    }

    finalDb.close();

    return {
      success: true,
      message: `SQLite race demo: Alice=$${aliceBalance}, Bob=$${bobBalance}`,
      output: `Race detected: ${
        aliceBalance !== expectedAlice || bobBalance !== expectedBob
      }`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Demo failed: ${errorMsg}`, "error");
    return {
      success: false,
      message: "SQLite race demo failed",
      error: errorMsg,
    };
  }
}

function initializeDatabase(): Database {
  // Remove old database
  try {
    const fs = require("fs");
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
    }
  } catch {
    // Ignore
  }

  // Create new database
  const db = new Database(DB_PATH);

  // Execute schema
  const schema = readFileSync("src/sqlite-demo/schema.sql", "utf8");
  const statements = schema.split(";").filter((s) => s.trim());

  for (const statement of statements) {
    if (statement.trim()) {
      db.run(statement);
    }
  }

  return db;
}

// Run if executed directly
if (import.meta.main) {
  demonstrateSQLiteRace()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
