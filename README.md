# ctxnazar

> Keep secrets out of AI context.

`ctxnazar` is a lightweight, local-first CLI that detects secrets and sensitive information in context files used by Claude Code, OpenAI Codex, Cursor, GitHub Copilot, Gemini, and other coding agents.

It runs entirely on your machine. It uses deterministic rules, makes no AI or network calls, uploads nothing, stores nothing, and never modifies scanned files.

## Features

- Finds common AI context files recursively
- Detects API keys, access tokens, private keys, URL credentials, and suspicious secret assignments
- Warns about sensitive-file references, private IP addresses, and internal endpoints
- Separates high-confidence secrets from contextual warnings
- Masks detected values in terminal and JSON output
- Prevents symlink traversal outside the selected project
- Offers human-readable and JSON reports
- Uses practical normal and strict failure thresholds for local and CI use

## Requirements

- Node.js 20 or newer

## Installation

Run without installing:

```bash
npx ctxnazar scan
```

Install globally after the package is published:

```bash
npm install --global ctxnazar
ctxnazar scan
```

For local development:

```bash
git clone https://github.com/hanzales/ctxnazar.git
cd ctxnazar
npm install
npm run build
node dist/cli.js scan
```

## Usage

```bash
# Scan the current directory (scan is the default command)
ctxnazar scan
ctxnazar

# Scan another project
ctxnazar scan ./my-project

# Machine-readable output
ctxnazar scan --json

# Fail on warnings as well as high-severity findings
ctxnazar scan --strict

# Disable ANSI colors
ctxnazar scan --no-color

ctxnazar --help
```

Normal mode exits with code `1` only for HIGH findings. Strict mode exits with code `1` for any finding. Scanning or argument errors use code `2`; a successful scan below the configured threshold uses code `0`.

## Files scanned

`ctxnazar` discovers these files inside the selected project root:

- `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, and `GEMINI.md`
- `.cursor/rules/*.mdc`
- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md`
- `.claude/skills/**/SKILL.md`
- `.agents/skills/**/SKILL.md`

Directories named `node_modules`, `.git`, `dist`, and `build` are ignored. Symbolic links are not followed. Files containing NUL bytes are treated as binary and skipped.

## Example output

```text
ctxnazar v0.1.0
Keep secrets out of AI context.

Scanning project...

✓ AGENTS.md                       Clean
⚠ CLAUDE.md                       1 finding
✗ .cursor/rules/security.mdc      1 finding

─────────────────────────────
Security Findings

MEDIUM  CLAUDE.md:3
        Instruction references a sensitive local file (CTX007)

HIGH    .cursor/rules/security.mdc:6
        Potential exposed OpenAI-style API key (CTX001)
```

The repository includes an intentionally unsafe, fake fixture in `examples/sample-context` so you can inspect real output:

```bash
npm run build
node dist/cli.js scan examples/sample-context --no-color
```

The sample exits with code `1` by design.

## Detection and limitations

The scanner checks for OpenAI-style keys, AWS access key identifiers, GitHub personal access tokens, PEM private key headers, credentials in URLs, suspicious secret assignments, actionable references to sensitive files, private IP addresses, and internal hostnames.

No deterministic scanner can identify every secret or fully understand intent. `ctxnazar` can produce false positives and false negatives. A clean result is not proof that a file is safe. It does not inspect arbitrary source files, validate whether credentials are active, scan Git history, or replace a full secret-scanning platform. Review every finding and rotate any real exposed credential.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance and [SECURITY.md](SECURITY.md) for responsible vulnerability reporting.

Suggested GitHub topics: `ai-security`, `ai-agents`, `claude-code`, `codex`, `cursor`, `context-engineering`, `secret-scanning`, `developer-tools`, `cli`, `typescript`.

## License

MIT © 2026 İlhan Emir
