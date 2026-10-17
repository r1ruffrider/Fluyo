import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const command = process.argv[2];

if (command !== "dev" && command !== "start") {
  throw new Error("Expected the Next.js dev or start command");
}

const port = process.env.WEB_PORT ?? "3000";
const nextCli = fileURLToPath(import.meta.resolve("next/dist/bin/next"));
const args = [nextCli, command, "--port", port];
if (command === "dev") {
  args.push("--webpack");
}

const child = spawn(process.execPath, args, {
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
