import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawn } from "bun";
import { header, log, logRace, section } from "../../utils/logger.ts";
import type { DemoResult, Account } from "../../utils/types.ts";
import chalk from "chalk";

/**
 * Demonstrates race condition in bank account transfers
 *
 * Multiple processes attempt concurrent withdrawals from the same account,
 * potentially causing negative balance or lost money.
 */

const ACCOUNTS_FILE = "/tmp/os-demo-accounts.json";
const INITIAL_BALANCE = 1000;

interface AccountsState {
  accounts: Account[];
}

export async function demonstrateBankRace(): Promise<DemoResult> {
  header("Race Condition Demo: Bank Account Transfers");

  try {
    // Initialize accounts
    section("Initializing Bank Accounts");
    initializeAccounts();

    // VISUAL PROOF: Show initial file content
    log("📄 File contents BEFORE:", "info");
    console.log(chalk.gray(readFileSync(ACCOUNTS_FILE, "utf8")));

    // Spawn concurrent withdrawal processes
    section("Spawning Concurrent Withdrawal Processes");
    const numWithdrawers = 4;
    const withdrawAmount = 300;

    log(
      `${numWithdrawers} processes will each try to withdraw $${withdrawAmount}`,
      "info"
    );
    log(`Initial Balance: $${INITIAL_BALANCE}`, "info");
    log(`Total Attempt:   $${numWithdrawers * withdrawAmount}`, "info");

    const workers: Promise<number | null>[] = [];

    for (let i = 0; i < numWithdrawers; i++) {
      const worker = spawn({
        cmd: [
          "bun",
          "run",
          "src/race-conditions/bank-account/withdrawer.ts",
          "1",
          String(withdrawAmount),
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

    // VISUAL PROOF: Show final file content
    log("📄 File contents AFTER:", "info");
    console.log(chalk.gray(readFileSync(ACCOUNTS_FILE, "utf8")));

    const finalState = readAccounts();
    const account = finalState.accounts.find((a) => a.id === 1);

    if (!account) {
      throw new Error("Account not found");
    }

    const actual = account.balance;
    const totalWithdrawn = INITIAL_BALANCE - actual;
    const successfulWithdrawals = totalWithdrawn / withdrawAmount;

    // VERIFICATION TABLE
    console.log("\n" + chalk.cyan("╔════════════════════════════════════╗"));
    console.log(chalk.cyan("║  VERIFICATION SUMMARY              ║"));
    console.log(chalk.cyan("╠════════════════════════════════════╣"));
    console.log(
      chalk.cyan("║") +
        ` Initial:       $${String(INITIAL_BALANCE).padEnd(19)} ` +
        chalk.cyan("║")
    );
    console.log(
      chalk.cyan("║") +
        ` Final:         $${String(actual).padEnd(19)} ` +
        chalk.cyan("║")
    );
    console.log(
      chalk.cyan("║") +
        ` Withdrawn:     $${String(totalWithdrawn).padEnd(19)} ` +
        chalk.cyan("║")
    );
    console.log(
      chalk.cyan("║") +
        ` Min Count:     0 ($0)               ` +
        chalk.cyan("║")
    );
    console.log(chalk.cyan("╚════════════════════════════════════╝") + "\n");

    if (account.balance < 0) {
      logRace(
        `RACE CONDITION! Account has negative balance: $${account.balance}`
      );
      log(
        "The file proves we allowed withdrawing money we didn't have!",
        "error"
      );
    } else if (totalWithdrawn > INITIAL_BALANCE) {
      logRace(
        `RACE CONDITION! Withdrew $${totalWithdrawn} from $${INITIAL_BALANCE}`
      );
    } else if (successfulWithdrawals % 1 !== 0) {
      logRace(`RACE CONDITION! Inconsistent withdrawal amount detected.`);
    } else {
      log(
        "No negative balance this time (races are non-deterministic)",
        "warn"
      );
    }

    cleanup();

    return {
      success: true,
      message: `Bank race demo: final balance $${account.balance}`,
      output: account.balance < 0 ? "NEGATIVE BALANCE!" : "Check logs",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Demo failed: ${errorMsg}`, "error");
    cleanup();
    return {
      success: false,
      message: "Bank account race demo failed",
      error: errorMsg,
    };
  }
}

function initializeAccounts(): void {
  const initialState: AccountsState = {
    accounts: [{ id: 1, balance: INITIAL_BALANCE }],
  };
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(initialState, null, 2), "utf8");
}

function readAccounts(): AccountsState {
  try {
    const data = readFileSync(ACCOUNTS_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return { accounts: [] };
  }
}

function cleanup(): void {
  if (existsSync(ACCOUNTS_FILE)) {
    try {
      const fs = require("fs");
      fs.unlinkSync(ACCOUNTS_FILE);
      log("Cleaned up accounts file", "info");
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  demonstrateBankRace()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
