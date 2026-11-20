#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Command, CommanderError } from "commander";
import { determineExitCode, renderJson, renderText, VERSION } from "./reporter.js";
import { scanProject } from "./scanner.js";

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  cwd: () => string;
}

const defaultIo: CliIo = {
  stdout: (text) => process.stdout.write(`${text}\n`),
  stderr: (text) => process.stderr.write(`${text}\n`),
  cwd: () => process.cwd()
};

export async function runCli(argv: string[], io: CliIo = defaultIo): Promise<number> {
  let exitCode = 0;
  const program = new Command();
  program
    .name("ctxnazar")
    .version(VERSION)
    .description("Keep secrets out of AI context.")
    .showHelpAfterError()
    .exitOverride()
    .configureOutput({ writeOut: (value) => io.stdout(value.trimEnd()), writeErr: (value) => io.stderr(value.trimEnd()) });

  program
    .command("scan [path]", { isDefault: true })
    .description("Scan AI agent context files")
    .option("--json", "print machine-readable JSON")
    .option("--strict", "fail on any finding")
    .option("--no-color", "disable terminal colors")
    .action(async (target: string | undefined, options: { json?: boolean; strict?: boolean; color?: boolean }) => {
      try {
        const root = path.resolve(io.cwd(), target ?? ".");
        const result = await scanProject(root);
        io.stdout(options.json ? renderJson(result) : renderText(result, { color: options.color ?? true }));
        exitCode = determineExitCode(result, options.strict ?? false);
      } catch (error) {
        io.stderr(`ctxnazar: ${error instanceof Error ? error.message : "Scanning failed"}`);
        exitCode = 2;
      }
    });

  try {
    await program.parseAsync(argv, { from: "node" });
  } catch (error) {
    if (error instanceof CommanderError) return error.exitCode === 0 ? 0 : 2;
    io.stderr(`ctxnazar: ${error instanceof Error ? error.message : "Unexpected error"}`);
    return 2;
  }
  return exitCode;
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) process.exitCode = await runCli(process.argv);
