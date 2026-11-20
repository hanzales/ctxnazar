import type { FindingKind, Severity } from "./types.js";

export interface RuleMetadata {
  id: string;
  severity: Severity;
  kind: FindingKind;
  message: string;
  remediation: string;
}

export const RULES = {
  openaiKey: { id: "CTX001", severity: "high", kind: "secret", message: "Potential exposed OpenAI-style API key", remediation: "Revoke the key, remove it from the file, and load it from a secret store or environment variable." },
  awsAccessKey: { id: "CTX002", severity: "high", kind: "secret", message: "Potential exposed AWS access key identifier", remediation: "Deactivate the credential and replace the literal value with a secure credential provider." },
  githubToken: { id: "CTX003", severity: "high", kind: "secret", message: "Potential exposed GitHub personal access token", remediation: "Revoke the token and use an environment variable or an approved secret store." },
  privateKey: { id: "CTX004", severity: "high", kind: "secret", message: "PEM private key material detected", remediation: "Remove the private key, rotate it, and reference a protected secret location instead." },
  urlCredentials: { id: "CTX005", severity: "high", kind: "secret", message: "Credentials embedded in a URL", remediation: "Remove URL credentials and inject authentication through a protected configuration mechanism." },
  secretAssignment: { id: "CTX006", severity: "high", kind: "secret", message: "Suspicious literal secret assignment", remediation: "Replace the literal with an environment variable or secret-store reference and rotate it if real." },
  sensitiveFile: { id: "CTX007", severity: "medium", kind: "warning", message: "Instruction references a sensitive local file", remediation: "Confirm the agent does not need this file and exclude sensitive content from its context." },
  internalEndpoint: { id: "CTX008", severity: "medium", kind: "warning", message: "Private network address or internal endpoint detected", remediation: "Remove or generalize internal infrastructure details before sharing this context." }
} as const satisfies Record<string, RuleMetadata>;

export const PATTERNS = {
  openaiKey: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/g,
  awsAccessKey: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  githubToken: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  privateKey: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  urlCredentials: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@[^\s]+/gi,
  secretAssignment: /\b(?:api[_-]?key|secret|token|password|passwd|client[_-]?secret)\b\s*[:=]\s*["']?([^\s"'`,;#]{8,})["']?/gi,
  sensitiveFile: /(?:\.env(?:\.[\w.-]+)?|\.aws\/credentials|\.ssh\/id_(?:rsa|ed25519|ecdsa)|credentials\.json|\.npmrc|\.pypirc|[^\s"'`]+\.(?:pem|key))\b/gi,
  actionVerb: /\b(?:read|load|open|include|attach|send|source|cat|copy|inspect|use|access)\b/i,
  privateIp: /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/g,
  internalHost: /(?<!\.)\b(?:[a-z0-9-]+\.)+(?:internal|corp|local)(?::\d{1,5})?\b/gi
} as const;
