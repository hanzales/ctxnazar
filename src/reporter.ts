import { Chalk } from "chalk";
import type { Finding, ScanResult } from "./types.js";

export const VERSION = "0.1.0";

export interface ReportOptions { color?: boolean; }

function findingLabel(finding: Finding): string {
  return finding.severity.toUpperCase();
}

export function renderText(result: ScanResult, options: ReportOptions = {}): string {
  const color = options.color ?? true;
  const c = new Chalk({ level: color ? 1 : 0 });
  const output: string[] = [c.cyan(`ctxnazar v${VERSION}`), "Keep secrets out of AI context.", "", "Scanning project...", ""];
  for (const file of result.files) {
    const high = file.findings.some((finding) => finding.severity === "high");
    const symbol = file.findings.length === 0 ? c.green("✓") : high ? c.red("✗") : c.yellow("⚠");
    const status = file.findings.length === 0 ? c.green("Clean") : c.yellow(`${file.findings.length} finding${file.findings.length === 1 ? "" : "s"}`);
    output.push(`${symbol} ${file.path.padEnd(32)} ${status}`);
  }
  output.push("", "─────────────────────────────", c.cyan("Security Findings"), "");
  if (result.findings.length === 0) output.push(c.green("No findings."), "");
  for (const finding of result.findings) {
    const label = finding.severity === "high" ? c.red(findingLabel(finding)) : c.yellow(findingLabel(finding));
    output.push(`${label.padEnd(color ? 16 : 8)}${finding.filePath}:${finding.line}`, `        ${finding.message} (${finding.ruleId})`, `        Remediation: ${finding.remediation}`, "");
  }
  if (result.errors.length > 0) {
    output.push(c.red("Scan Errors"), "");
    for (const error of result.errors) output.push(`ERROR   ${error.path}`, `        ${error.message}`, "");
  }
  output.push("─────────────────────────────", `Files scanned: ${result.files.length}`, `Findings: ${result.findings.length}`, "", result.findings.length ? "Review findings before sharing this context with an AI agent." : "No known context risks were detected.");
  return output.join("\n");
}

export function renderJson(result: ScanResult): string {
  return JSON.stringify({ version: VERSION, ...result }, null, 2);
}

export function determineExitCode(result: ScanResult, strict: boolean): 0 | 1 | 2 {
  if (result.errors.length > 0) return 2;
  if (strict ? result.findings.length > 0 : result.findings.some((finding) => finding.severity === "high")) return 1;
  return 0;
}
