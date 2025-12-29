import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { spawn } from "bun";
import { header, log, logRace, section } from "../utils/logger.ts";
import type { DemoResult } from "../utils/types.ts";
import chalk from "chalk";

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

    // VISUAL PROOF: Show initial DB rows
    log("📊 Database Rows BEFORE:", "info");
    const initialAccounts = db.query("SELECT * FROM accounts").all();
    console.table(initialAccounts);

    db.close();

    // Spawn concurrent transfer processes
    section("Spawning Concurrent Transfer Processes");
    const numProcesses = 5;
    const transferAmount = 100;

    log(
      `${numProcesses} processes will transfer $${transferAmount} from Alice to Bob`,
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
          String(transferAmount),
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

    // VISUAL PROOF: Show final DB rows
    log("📊 Database Rows AFTER:", "info");
    console.table(finalAccounts);

    let aliceBalance = 0;
    let bobBalance = 0;

    for (const account of finalAccounts as any[]) {
      if (account.name === "Alice") aliceBalance = account.balance;
      if (account.name === "Bob") bobBalance = account.balance;
    }

    // Analysis
    const expectedAlice = 1000 - numProcesses * transferAmount;
    const expectedBob = 1000 + numProcesses * transferAmount;
    const totalMoney = aliceBalance + bobBalance;
    const expectedTotal = 1000 + 1000;
    const lostMoney = expectedTotal - totalMoney;

    // VERIFICATION TABLE
    console.log("\n" + chalk.cyan("╔════════════════════════════════════╗"));
    console.log(chalk.cyan("║  VERIFICATION SUMMARY              ║"));
    console.log(chalk.cyan("╠════════════════════════════════════╣"));
    console.log(
      chalk.cyan("║") +
        ` Expected Alice: $${String(expectedAlice).padEnd(19)} ` +
        chalk.cyan("║")
    );
    console.log(
      chalk.cyan("║") +
        ` Actual Alice:   $${String(aliceBalance).padEnd(19)} ` +
        chalk.cyan("║")
    );
    console.log(
      chalk.cyan("║") +
        ` Expected Bob:   $${String(expectedBob).padEnd(19)} ` +
        chalk.cyan("║")
    );
    console.log(
      chalk.cyan("║") +
        ` Actual Bob:     $${String(bobBalance).padEnd(19)} ` +
        chalk.cyan("║")
    );
    console.log(chalk.cyan("╠════════════════════════════════════╣"));
    console.log(
      chalk.cyan("║") +
        ` Total Money:    $${String(totalMoney).padEnd(19)} ` +
        chalk.cyan("║")
    );
    const lostStr = `$${lostMoney} ${lostMoney !== 0 ? "⚠️" : ""}`;
    console.log(
      chalk.cyan("║") +
        ` MONEY LOST:     ${lostStr.padEnd(19)} ` +
        chalk.cyan("║")
    );
    console.log(chalk.cyan("╚════════════════════════════════════╝") + "\n");

    if (lostMoney !== 0) {
      logRace("RACE CONDITION DETECTED!");
      log("Money simply disappeared from the system!", "error");
    } else {
      log("No race detected this time (races are non-deterministic)", "warn");
    }

    finalDb.close();

    return {
      success: true,
      message: `SQLite race demo: Alice=$${aliceBalance}, Bob=$${bobBalance}`,
      output: `Lost $${lostMoney}`,
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
  try {
    const fs = require("fs");
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
    }
  } catch {
    // Ignore
  }

  const db = new Database(DB_PATH);

  const schema = readFileSync("src/sqlite-demo/schema.sql", "utf8");
  const statements = schema.split(";").filter((s) => s.trim());

  for (const statement of statements) {
    if (statement.trim()) {
      db.run(statement);
    }
  }

  return db;
}

if (import.meta.main) {
  demonstrateSQLiteRace()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
