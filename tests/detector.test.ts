import { describe, expect, it } from "vitest";
import { detect, maskSecret } from "../src/detector.js";

describe("detector", () => {
  it("detects and classifies supported secret patterns", () => {
    const content = [
      "key: sk-proj-abcdefghijklmnopqrstuvwxyz123456",
      "aws=AKIAIOSFODNN7EXAMPLE",
      "token=ghp_abcdefghijklmnopqrstuvwxyz123456",
      "db=https://admin:supersecret@db.example.test/app",
      "-----BEGIN PRIVATE KEY-----"
    ].join("\n");
    const findings = detect(content, "AGENTS.md");
    expect(findings.map((item) => item.ruleId)).toEqual(expect.arrayContaining(["CTX001", "CTX002", "CTX003", "CTX004", "CTX005"]));
    expect(findings.every((item) => item.severity === "high")).toBe(true);
  });

  it("treats sensitive file references and internal endpoints as warnings", () => {
    const findings = detect("Read .env.production then call api.service.internal or 10.20.30.40.", "CLAUDE.md");
    expect(findings.map((item) => item.ruleId)).toEqual(expect.arrayContaining(["CTX007", "CTX008"]));
    expect(findings.every((item) => item.severity === "medium")).toBe(true);
  });

  it("does not flag benign mentions and placeholders", () => {
    const content = "Never commit .env files.\nDo not share .env.local.\napi_key = ${API_KEY}\ntoken: YOUR_TOKEN\nUse example.com.";
    expect(detect(content, "AGENTS.md")).toEqual([]);
  });

  it("masks secrets without retaining the full value", () => {
    const secret = "sk-proj-abcdefghijklmnopqrstuvwxyz123456";
    const masked = maskSecret(secret);
    expect(masked).not.toContain(secret);
    expect(masked).toMatch(/^sk-p…/);
    expect(maskSecret("https://admin:supersecret@db.example.test/app")).toBe("https://<redacted>:<redacted>@db.example.test/app");
  });
});
