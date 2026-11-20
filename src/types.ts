export type Severity = "high" | "medium";
export type FindingKind = "secret" | "warning";

export interface Finding {
  ruleId: string;
  severity: Severity;
  kind: FindingKind;
  filePath: string;
  line: number;
  message: string;
  remediation: string;
  maskedEvidence: string;
}

export interface FileScanResult {
  path: string;
  findings: Finding[];
}

export interface ScanError {
  path: string;
  message: string;
}

export interface ScanResult {
  root: string;
  files: FileScanResult[];
  findings: Finding[];
  errors: ScanError[];
}
