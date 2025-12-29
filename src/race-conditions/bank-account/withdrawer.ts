import { readFileSync, writeFileSync } from "fs";
import { log, logRace } from "../../utils/logger.ts";
import type { Account } from "../../utils/types.ts";

/**
 * Process that attempts to withdraw from a bank account
 * WITHOUT proper race condition protection
 */

const ACCOUNTS_FILE = "/tmp/os-demo-accounts.json";

const accountId = parseInt(process.argv[2] ?? "1");
const withdrawAmount = parseInt(process.argv[3] ?? "100");

interface AccountsState {
  accounts: Account[];
}

async function main(): Promise<void> {
  log(
    `Attempting to withdraw $${withdrawAmount} from account ${accountId}`,
    "info"
  );

  // Small random delay before checking
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

  // READ the accounts
  const state = readAccounts();
  const account = state.accounts.find((a) => a.id === accountId);

  if (!account) {
    log(`Account ${accountId} not found`, "error");
    process.exit(1);
  }

  log(`Current balance: $${account.balance}`, "info");

  // CHECK if sufficient funds (this is where the race happens!)
  if (account.balance >= withdrawAmount) {
    log(`Sufficient funds available, proceeding with withdrawal...`, "success");

    // Simulate processing delay (ATM communication, verification, etc.)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

    // MODIFY the balance
    account.balance -= withdrawAmount;

    // WRITE back the updated state
    writeAccounts(state);

    log(`Withdrawal successful! New balance: $${account.balance}`, "success");

    // Check if we caused negative balance
    if (account.balance < 0) {
      logRace(`Created negative balance! Balance is now $${account.balance}`);
    }
  } else {
    log(
      `Insufficient funds. Balance: $${account.balance}, Need: $${withdrawAmount}`,
      "warn"
    );
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
  process.exit(1);
});
