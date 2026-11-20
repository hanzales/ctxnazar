import { PATTERNS, RULES, type RuleMetadata } from "./rules.js";
import type { Finding } from "./types.js";

const PLACEHOLDER = /(?:\$\{|process\.env|env\.|<[^>]+>|your[_-]|example|dummy|fake|redacted|replace|changeme|not-a-real)/i;

export function maskSecret(value: string): string {
  if (value.includes("BEGIN") && value.includes("PRIVATE KEY")) return "[private key block redacted]";
  try {
    const url = new URL(value);
    if (url.username || url.password) return `${url.protocol}//<redacted>:<redacted>@${url.host}${url.pathname}`;
  } catch { /* Not a URL. */ }
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function matches(pattern: RegExp, text: string): RegExpMatchArray[] {
  return [...text.matchAll(new RegExp(pattern.source, pattern.flags))];
}

function addFinding(findings: Finding[], seen: Set<string>, rule: RuleMetadata, filePath: string, line: number, evidence: string): void {
  const key = `${rule.id}:${line}:${evidence}`;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({ ruleId: rule.id, severity: rule.severity, kind: rule.kind, filePath, line, message: rule.message, remediation: rule.remediation, maskedEvidence: maskSecret(evidence) });
}

export function detect(content: string, filePath: string): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const lines = content.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    const line = index + 1;
    for (const match of matches(PATTERNS.openaiKey, lineText)) addFinding(findings, seen, RULES.openaiKey, filePath, line, match[0]);
    for (const match of matches(PATTERNS.awsAccessKey, lineText)) addFinding(findings, seen, RULES.awsAccessKey, filePath, line, match[0]);
    for (const match of matches(PATTERNS.githubToken, lineText)) addFinding(findings, seen, RULES.githubToken, filePath, line, match[0]);
    for (const match of matches(PATTERNS.privateKey, lineText)) addFinding(findings, seen, RULES.privateKey, filePath, line, match[0]);
    for (const match of matches(PATTERNS.urlCredentials, lineText)) addFinding(findings, seen, RULES.urlCredentials, filePath, line, match[0]);
    for (const match of matches(PATTERNS.secretAssignment, lineText)) {
      const value = match[1] ?? match[0];
      if (!PLACEHOLDER.test(value)) addFinding(findings, seen, RULES.secretAssignment, filePath, line, value);
    }
    if (PATTERNS.actionVerb.test(lineText)) {
      for (const match of matches(PATTERNS.sensitiveFile, lineText)) addFinding(findings, seen, RULES.sensitiveFile, filePath, line, match[0]);
    }
    for (const match of matches(PATTERNS.privateIp, lineText)) addFinding(findings, seen, RULES.internalEndpoint, filePath, line, match[0]);
    for (const match of matches(PATTERNS.internalHost, lineText)) addFinding(findings, seen, RULES.internalEndpoint, filePath, line, match[0]);
  });

  return findings.sort((a, b) => a.line - b.line || a.ruleId.localeCompare(b.ruleId));
}
