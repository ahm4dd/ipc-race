import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawn } from "bun";
import { header, log, section } from "../../utils/logger.ts";
import type { DemoResult, Account } from "../../utils/types.ts";

/**
 * Bank account transfers SOLVED using mutex
 *
 * The mutex ensures that balance checking and withdrawal happen atomically,
 * preventing negative balances and lost money.
 */

const ACCOUNTS_FILE = "/tmp/os-demo-accounts-solved.json";
const INITIAL_BALANCE = 1000;

interface AccountsState {
  accounts: Account[];
}

export async function demonstrateBankSolution(): Promise<DemoResult> {
  header("Race Solution: Bank Account with Mutex Protection");

  try {
    // Initialize accounts
    section("Initializing Bank Accounts");
    initializeAccounts();
    log(`Account 1 initialized with balance: $${INITIAL_BALANCE}`, "success");

    // Spawn concurrent withdrawal processes (with mutex)
    section("Spawning Withdrawal Processes (Mutex Protected)");
    const numWithdrawers = 4;
    const withdrawAmount = 300;

    log(
      `${numWithdrawers} processes will each try to withdraw $${withdrawAmount}`,
      "info"
    );
    log(`Account balance: $${INITIAL_BALANCE}`, "info");
    log(
      `With mutex: only successful withdrawals that maintain positive balance`,
      "info"
    );

    const workers: Promise<number | null>[] = [];

    for (let i = 0; i < numWithdrawers; i++) {
      const worker = spawn({
        cmd: [
          "bun",
          "run",
          "src/race-conditions/bank-account/withdrawer-mutex.ts",
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
    section("Solution Results");
    const finalState = readAccounts();
    const account = finalState.accounts.find((a) => a.id === 1);

    if (!account) {
      throw new Error("Account not found");
    }

    log(`Final balance: $${account.balance}`, "info");

    if (account.balance >= 0) {
      log("SUCCESS! Balance never went negative", "success");
      log("Mutex ensured atomic check-and-withdraw operations", "success");
    } else {
      log(`Still negative: $${account.balance}`, "error");
    }

    const withdrawn = INITIAL_BALANCE - account.balance;
    log(`Total successfully withdrawn: $${withdrawn}`, "info");

    cleanup();

    return {
      success: true,
      message: `Bank solution: final balance $${account.balance} (mutex protected)`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Demo failed: ${errorMsg}`, "error");
    cleanup();
    return {
      success: false,
      message: "Bank account solution failed",
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
  demonstrateBankSolution()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
