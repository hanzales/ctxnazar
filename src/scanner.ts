import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { detect } from "./detector.js";
import type { ScanResult } from "./types.js";

const IGNORED_DIRECTORIES = new Set(["node_modules", ".git", "dist", "build"]);

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isContextFile(relativePath: string): boolean {
  const normalized = relativePath.split(path.sep).join("/");
  const base = path.posix.basename(normalized);
  if (["AGENTS.md", "CLAUDE.md", "SKILL.md", "GEMINI.md"].includes(base)) return true;
  if (/^\.cursor\/rules\/[^/]+\.mdc$/.test(normalized)) return true;
  if (normalized === ".github/copilot-instructions.md") return true;
  return /^\.github\/instructions\/[^/]+\.instructions\.md$/.test(normalized);
}

export async function discoverContextFiles(projectRoot: string): Promise<string[]> {
  const root = await realpath(projectRoot);
  const found: string[] = [];

  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const absolute = path.join(directory, entry.name);
      if (!isInside(root, absolute)) continue;
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) await walk(absolute);
      } else if (entry.isFile() && isContextFile(path.relative(root, absolute))) {
        found.push(absolute);
      }
    }
  }

  await walk(root);
  return found.sort((a, b) => path.relative(root, a).localeCompare(path.relative(root, b)));
}

export interface ScannerDependencies {
  readFile: typeof readFile;
}

export async function scanProject(projectRoot: string, dependencies: ScannerDependencies = { readFile }): Promise<ScanResult> {
  const root = await realpath(projectRoot);
  const files = [];
  const errors = [];
  const discovered = await discoverContextFiles(root);

  for (const absolute of discovered) {
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    try {
      const stat = await lstat(absolute);
      if (stat.isSymbolicLink()) continue;
      const resolved = await realpath(absolute);
      if (!isInside(root, resolved)) continue;
      const buffer = await dependencies.readFile(resolved);
      if (buffer.includes(0)) continue;
      const findings = detect(buffer.toString("utf8"), relative);
      files.push({ path: relative, findings });
    } catch (error) {
      errors.push({ path: relative, message: error instanceof Error ? error.message : "Unknown file read error" });
    }
  }

  return { root, files, findings: files.flatMap((file) => file.findings), errors };
}
