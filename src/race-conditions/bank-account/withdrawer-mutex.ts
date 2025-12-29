import { readFileSync, writeFileSync } from "fs";
import { log } from "../../utils/logger.ts";
import { FileMutex } from "../../solutions/mutex.ts";
import type { Account } from "../../utils/types.ts";

/**
 * Withdrawal process WITH mutex protection
 * Ensures atomic check-and-withdraw operation
 */

const ACCOUNTS_FILE = "/tmp/os-demo-accounts-solved.json";
const mutex = new FileMutex("bank-mutex");

const accountId = parseInt(process.argv[2] ?? "1");
const withdrawAmount = parseInt(process.argv[3] ?? "100");

interface AccountsState {
  accounts: Account[];
}

async function main(): Promise<void> {
  log(
    `Attempting to withdraw $${withdrawAmount} from account ${accountId} (mutex-protected)`,
    "info"
  );

  // ACQUIRE MUTEX - ensures exclusive access to account
  const acquired = await mutex.acquire();

  if (!acquired) {
    log("Failed to acquire mutex", "error");
    process.exit(1);
  }

  try {
    // CRITICAL SECTION - check and withdraw atomically

    // Small delay before checking
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

    const state = readAccounts();
    const account = state.accounts.find((a) => a.id === accountId);

    if (!account) {
      log(`Account ${accountId} not found`, "error");
      return;
    }

    log(`Current balance: $${account.balance}`, "info");

    if (account.balance >= withdrawAmount) {
      log(`Sufficient funds, proceeding with withdrawal...`, "success");

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

      account.balance -= withdrawAmount;
      writeAccounts(state);

      log(`Withdrawal successful! New balance: $${account.balance}`, "success");
    } else {
      log(
        `Insufficient funds. Balance: $${account.balance}, Need: $${withdrawAmount}`,
        "warn"
      );
      log("Withdrawal rejected to prevent negative balance", "warn");
    }
  } finally {
    // RELEASE MUTEX - allow other processes to access account
    mutex.release();
  }
}

function readAccounts(): AccountsState {
  const data = readFileSync(ACCOUNTS_FILE, "utf8");
  return JSON.parse(data);
}

function writeAccounts(state: AccountsState): void {
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(state, null, 2), "utf8");
}

main().catch((error) => {
  log(
    `Withdrawal error: ${
      error instanceof Error ? error.message : String(error)
    }`,
    "error"
  );
  mutex.release();
  process.exit(1);
});
