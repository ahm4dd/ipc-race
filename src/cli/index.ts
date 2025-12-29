#!/usr/bin/env bun
import chalk from "chalk";
import { header, section, log } from "../utils/logger.ts";

// Import all demo functions
import { demonstrateProducerConsumer } from "../ipc/producer-consumer.ts";
import { demonstrateCounterRace } from "../race-conditions/counter/race.ts";
import { demonstrateCounterSolution } from "../race-conditions/counter/solution.ts";
import { demonstrateBankRace } from "../race-conditions/bank-account/race.ts";
import { demonstrateBankSolution } from "../race-conditions/bank-account/solution.ts";
import { demonstrateSQLiteRace } from "../sqlite-demo/race-demo.ts";
import { demonstrateSQLiteTransactions } from "../sqlite-demo/transaction-demo.ts";

/**
 * Unified CLI for OS Concepts Demo
 *
 * Interactive menu to access all IPC and race condition demonstrations
 */

interface DemoItem {
  name: string;
  description: string;
  run: () => Promise<any>;
  category: "ipc" | "race" | "solution" | "sqlite";
}

const demos: DemoItem[] = [
  // IPC Demos
  {
    name: "Producer-Consumer",
    description: "Classic pattern with buffer management",
    run: demonstrateProducerConsumer,
    category: "ipc",
  },

  // Race Condition Demos
  {
    name: "Counter Race",
    description: "Lost updates in concurrent increments",
    run: demonstrateCounterRace,
    category: "race",
  },
  {
    name: "Counter Solution (Mutex)",
    description: "Mutex prevents lost updates",
    run: demonstrateCounterSolution,
    category: "solution",
  },
  {
    name: "Bank Transfer Race",
    description: "Concurrent withdrawals causing negative balance",
    run: demonstrateBankRace,
    category: "race",
  },
  {
    name: "Bank Transfer Solution (Mutex)",
    description: "Mutex ensures atomic check-and-withdraw",
    run: demonstrateBankSolution,
    category: "solution",
  },

  // SQLite Demos
  {
    name: "SQLite Race (No Transactions)",
    description: "Database race conditions demonstrated",
    run: demonstrateSQLiteRace,
    category: "sqlite",
  },
  {
    name: "SQLite Solution (Transactions)",
    description: "ACID transactions prevent races",
    run: demonstrateSQLiteTransactions,
    category: "sqlite",
  },
];

async function showMenu(): Promise<void> {
  console.clear();
  header("OS Concepts Demo - Interactive Menu");

  console.log(chalk.cyan("\nChoose a category:\n"));
  console.log(chalk.yellow("1.") + " IPC Demonstrations");
  console.log(chalk.yellow("2.") + " Race Condition Problems");
  console.log(chalk.yellow("3.") + " Race Condition Solutions");
  console.log(chalk.yellow("4.") + " SQLite & Transactions");
  console.log(chalk.yellow("5.") + " Run All Demos");
  console.log(chalk.yellow("6.") + " Exit\n");

  const choice = prompt(chalk.green("Enter choice (1-6): "));

  switch (choice) {
    case "1":
      await showCategoryDemos("ipc", "IPC Demonstrations");
      break;
    case "2":
      await showCategoryDemos("race", "Race Condition Problems");
      break;
    case "3":
      await showCategoryDemos("solution", "Race Condition Solutions");
      break;
    case "4":
      await showCategoryDemos("sqlite", "SQLite & Transactions");
      break;
    case "5":
      await runAllDemos();
      break;
    case "6":
      console.log(chalk.green("\n✓ Exiting...\n"));
      process.exit(0);
    default:
      console.log(chalk.red("\n✗ Invalid choice\n"));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await showMenu();
  }
}

async function showCategoryDemos(
  category: DemoItem["category"],
  title: string
): Promise<void> {
  console.clear();
  header(title);

  const categoryDemos = demos.filter((d) => d.category === category);

  console.log(chalk.cyan("\nAvailable demos:\n"));
  categoryDemos.forEach((demo, index) => {
    console.log(chalk.yellow(`${index + 1}.`) + ` ${demo.name}`);
    console.log(chalk.gray(`   ${demo.description}\n`));
  });
  console.log(chalk.yellow("0.") + " Back to main menu\n");

  const choice = prompt(
    chalk.green(`Enter choice (0-${categoryDemos.length}): `)
  );
  const index = parseInt(choice ?? "0") - 1;

  if (choice === "0") {
    await showMenu();
    return;
  }

  if (index >= 0 && index < categoryDemos.length) {
    const demo = categoryDemos[index];
    if (demo) {
      await runDemo(demo);
    }
  } else {
    console.log(chalk.red("\n✗ Invalid choice\n"));
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await showCategoryDemos(category, title);
}

async function runDemo(demo: DemoItem): Promise<void> {
  console.log(chalk.cyan(`\n▶ Running: ${demo.name}\n`));

  try {
    const result = await demo.run();

    console.log(chalk.green(`\n✓ Demo completed: ${result.message}\n`));

    if (result.output) {
      console.log(chalk.gray(`Output: ${result.output}\n`));
    }
  } catch (error) {
    console.log(
      chalk.red(
        `\n✗ Demo failed: ${
          error instanceof Error ? error.message : String(error)
        }\n`
      )
    );
  }

  prompt(chalk.yellow("Press Enter to continue..."));
}

async function runAllDemos(): Promise<void> {
  console.clear();
  header("Running All Demos");

  console.log(chalk.yellow("\nThis will run all demos sequentially.\n"));
  const confirm = prompt(chalk.green("Continue? (y/n): "));

  if (confirm?.toLowerCase() !== "y") {
    await showMenu();
    return;
  }

  let successful = 0;
  let failed = 0;

  for (const demo of demos) {
    section(`Running: ${demo.name}`);

    try {
      await demo.run();
      successful++;
      log(`✓ ${demo.name} completed`, "success");
    } catch (error) {
      failed++;
      log(`✗ ${demo.name} failed`, "error");
    }

    console.log(""); // Spacing
  }

  section("Summary");
  log(`Total demos: ${demos.length}`, "info");
  log(`Successful: ${successful}`, "success");
  log(`Failed: ${failed}`, failed > 0 ? "error" : "info");

  prompt(chalk.yellow("\nPress Enter to return to menu..."));
  await showMenu();
}

async function main(): Promise<void> {
  try {
    await showMenu();
  } catch (error) {
    console.error(chalk.red("Fatal error:"), error);
    process.exit(1);
  }
}

main();
