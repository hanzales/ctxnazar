import { mkdtemp, mkdir, readFile, realpath, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { determineExitCode, renderJson } from "../src/reporter.js";
import { discoverContextFiles, scanProject } from "../src/scanner.js";

async function fixture(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "ctxnazar-test-"));
}

describe("scanner", () => {
  it("discovers nested context files and ignores excluded directories", async () => {
    const root = await fixture();
    await mkdir(path.join(root, ".claude/skills/review"), { recursive: true });
    await mkdir(path.join(root, "node_modules/pkg"), { recursive: true });
    await writeFile(path.join(root, "AGENTS.md"), "Clean instructions");
    await writeFile(path.join(root, ".claude/skills/review/SKILL.md"), "Clean skill");
    await writeFile(path.join(root, "node_modules/pkg/CLAUDE.md"), "ignored");
    const files = await discoverContextFiles(root);
    const canonicalRoot = await realpath(root);
    expect(files.map((file) => path.relative(canonicalRoot, file))).toEqual([".claude/skills/review/SKILL.md", "AGENTS.md"]);
  });

  it("never follows a symlink outside the project root", async () => {
    const root = await fixture();
    const outside = await fixture();
    await writeFile(path.join(outside, "CLAUDE.md"), "token=ghp_abcdefghijklmnopqrstuvwxyz123456");
    await symlink(path.join(outside, "CLAUDE.md"), path.join(root, "CLAUDE.md"));
    expect(await discoverContextFiles(root)).toEqual([]);
  });

  it("reports file read errors", async () => {
    const root = await fixture();
    await writeFile(path.join(root, "AGENTS.md"), "clean");
    const failingRead = (async () => { throw new Error("permission denied"); }) as unknown as typeof readFile;
    const result = await scanProject(root, { readFile: failingRead });
    expect(result.errors[0]).toMatchObject({ path: "AGENTS.md", message: "permission denied" });
    expect(determineExitCode(result, false)).toBe(2);
  });

  it("renders masked JSON and applies normal and strict exit thresholds", async () => {
    const root = await fixture();
    await writeFile(path.join(root, "CLAUDE.md"), "Read .env.local");
    const warning = await scanProject(root);
    expect(determineExitCode(warning, false)).toBe(0);
    expect(determineExitCode(warning, true)).toBe(1);
    const raw = "sk-proj-abcdefghijklmnopqrstuvwxyz123456";
    await writeFile(path.join(root, "AGENTS.md"), raw);
    const high = await scanProject(root);
    const json = renderJson(high);
    expect(json).not.toContain(raw);
    expect(JSON.parse(json).findings[0]).toHaveProperty("maskedEvidence");
    expect(determineExitCode(high, false)).toBe(1);
  });

  it("supports JSON CLI output and returns exit codes", async () => {
    const root = await fixture();
    await writeFile(path.join(root, "AGENTS.md"), "No secrets here.");
    const stdout: string[] = [];
    const code = await runCli(["node", "ctxnazar", "scan", root, "--json"], { stdout: (text) => stdout.push(text), stderr: () => undefined, cwd: () => root });
    expect(code).toBe(0);
    expect(JSON.parse(stdout.join("\n"))).toMatchObject({ findings: [], errors: [] });
  });
});
