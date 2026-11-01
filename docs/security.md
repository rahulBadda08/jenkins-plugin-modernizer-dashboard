# Security Architecture & Hardening Specifications

## Threat Model & Mitigations

The Jenkins Plugin Modernizer Dashboard executes client-side in public web browsers and during automated GitHub Actions build/sync workflows. The platform enforces strict defenses against command injection, Cross-Site Scripting (XSS), formula injection, and credential leakage.

---

### 1. Command & Shell Injection Defense
- **Identifier Allowlist**: Plugin names and repository targets used in command generation must strictly match the regular expression:
  ```
  ^[a-zA-Z0-9._-]+$
  ```
- **Rejection Over Sanitization**: When a plugin name fails identifier validation, the generator explicitly refuses to generate commands rather than silently rewriting the name. Silently removing characters can mutate a malicious name into a legitimate-looking target repository.
- **Safe Master Script Generation**: `src/application/remediation/generateMasterScript.ts` generates batch `.sh` scripts with:
  - `SHELL_ADVISORY_HEADER`: Explicit notice that scripts are advisory recommendations requiring maintainer review.
  - `set -euo pipefail`: Safe execution defaults in generated bash files.
  - Static safe comments for skipped entities: Untrusted input is never interpolated into comments or executable code.

---

### 2. URL & External Link Validation
- **Protocol Enforcement**: External links (e.g. Pull Request URLs, repository URLs) are validated using `isValidExternalUrl()`.
- **Allowed Schemes**: Only `http:` and `https:` schemes are accepted. Protocols like `javascript:`, `data:`, `vbscript:`, or `file:` are immediately rejected.
- **Credential Protection**: URLs containing embedded credentials (`user:pass@host`) are strictly rejected.
- **ExcelJS Hyperlink Defense**: In `DataExplorer.tsx`, invalid or untrusted URLs are replaced with safe plain text strings (`N/A`) before attaching spreadsheet hyperlinks.

---

### 3. CSV / Spreadsheet Formula Injection (CSV Injection)
- **Cell Sanitization**: Export cells pass through `sanitizeCsvCell()` in `src/domain/security.ts`.
- **Trigger Neutralization**: Characters that trigger formula execution in Microsoft Excel, LibreOffice Calc, or Google Sheets (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`, `|`) are prefixed with a single quote (`'`), even if preceded by leading spaces or newlines.
- **BOM Stripping**: Leading UTF-8 Byte Order Marks (`\uFEFF`) are stripped to prevent formula trigger masking.

---

### 4. GitHub Credential Protection & Resilient Fallback
- **Token Suppression**: `scripts/fetchData.mjs` suppresses token contents in all log outputs and stack traces.
- **Automatic Public Fallback**: If an authentication token provided in CI or environment returns HTTP 401 or 403 on public repository endpoints, credentials are automatically dropped for that and subsequent requests to continue unauthenticated.
- **Permanent Error Non-Retry**: Permanent HTTP errors (400, 401 without auth, 403 rate limit, 404, 422) are never retried, preventing log pollution and rate limit depletion.

---

### 5. Multi-Key Security & CVE Check Classification
- **Case-Insensitive Multi-Key Scan**: In `src/domain/checkClassification.ts`, all check-runs containing `security`, `cve`, or `vulnerability` are evaluated.
- **Fail-Fast Risk Detection**: If any security check has status `failure`, `fail`, or `error`, the plugin is immediately classified as having `Vulnerabilities` and assigned a `danger` severity status.
- **Strict Secured Criteria**: A plugin is classified as `Secured` if and only if at least one security check exists and every security check has passed.
