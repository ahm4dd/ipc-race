import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawn } from "bun";
import { header, log, logRace, section } from "../../utils/logger.ts";
import type { DemoResult, Account } from "../../utils/types.ts";

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
    log(`Account 1 initialized with balance: $${INITIAL_BALANCE}`, "success");

    // Spawn concurrent withdrawal processes
    section("Spawning Concurrent Withdrawal Processes");
    const numWithdrawers = 4;
    const withdrawAmount = 300;

    log(
      `${numWithdrawers} processes will each try to withdraw $${withdrawAmount}`,
      "info"
    );
    log(`Account balance: $${INITIAL_BALANCE}`, "info");
    log(
      `Total withdrawal attempt: $${numWithdrawers * withdrawAmount}`,
      "info"
    );
    log(`Should reject some withdrawals to prevent negative balance`, "warn");

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
    const finalState = readAccounts();
    const account = finalState.accounts.find((a) => a.id === 1);

    if (!account) {
      throw new Error("Account not found");
    }

    log(`Final balance: $${account.balance}`, "info");
    log(`Expected minimum: $0 (cannot go negative)`, "info");

    if (account.balance < 0) {
      logRace(
        `RACE CONDITION! Account has negative balance: $${account.balance}`
      );
      log("This should never happen in a real bank!", "error");
    } else if (account.balance > 0 && account.balance < INITIAL_BALANCE) {
      log(`Some withdrawals succeeded, balance is $${account.balance}`, "info");
      const withdrawn = INITIAL_BALANCE - account.balance;
      log(`Total withdrawn: $${withdrawn}`, "info");

      if (withdrawn > INITIAL_BALANCE) {
        logRace(
          `Race allowed over-withdrawal! Withdrew $${withdrawn} from $${INITIAL_BALANCE}`
        );
      }
    } else if (account.balance === 0) {
      log("Account was completely drained", "info");
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
