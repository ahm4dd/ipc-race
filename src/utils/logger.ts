import chalk from "chalk";

/**
 * Simple logger with colored output and process information
 */

export function log(
  message: string,
  level: "info" | "success" | "error" | "warn" = "info"
): void {
  const timestamp = new Date().toISOString().split("T")[1]?.slice(0, 12) ?? "";
  const pid = process.pid;

  let coloredMessage: string;
  switch (level) {
    case "success":
      coloredMessage = chalk.green(`✓ ${message}`);
      break;
    case "error":
      coloredMessage = chalk.red(`✗ ${message}`);
      break;
    case "warn":
      coloredMessage = chalk.yellow(`⚠ ${message}`);
      break;
    default:
      coloredMessage = chalk.blue(`ℹ ${message}`);
  }

  console.log(
    `${chalk.gray(`[${timestamp}]`)} ${chalk.cyan(
      `[PID ${pid}]`
    )} ${coloredMessage}`
  );
}

export function logRace(message: string): void {
  const timestamp = new Date().toISOString().split("T")[1]?.slice(0, 12) ?? "";
  const pid = process.pid;
  console.log(
    `${chalk.gray(`[${timestamp}]`)} ${chalk.cyan(
      `[PID ${pid}]`
    )} ${chalk.magenta(`⚡ RACE: ${message}`)}`
  );
}

export function section(title: string): void {
  console.log("\n" + chalk.bold.underline(title));
}

export function header(title: string): void {
  const line = "=".repeat(60);
  console.log("\n" + chalk.bold.cyan(line));
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(chalk.bold.cyan(line) + "\n");
}
