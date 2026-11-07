import { runCli } from "./cli";

if (import.meta.main) {
  process.exitCode = await runCli(process.argv.slice(2));
}
