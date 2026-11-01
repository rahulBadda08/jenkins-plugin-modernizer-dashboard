# Jenkins Plugin Modernizer Dashboard

[![Deploy Dashboard](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/deploy-pages.yml)
[![Sync Ecosystem Data](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/sync-plugin-data.yml/badge.svg)](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/sync-plugin-data.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A high-fidelity, public analytics dashboard for visualizing the health, modernization velocity, and architectural alignment of the Jenkins plugin ecosystem. This platform consumes telemetry produced by the [Jenkins Plugin Modernizer Tool](https://github.com/jenkins-infra/plugin-modernizer-tool) and surfaces actionable remediation pathways for plugin maintainers and community contributors.

## 🚀 Live Dashboard
**[View the Jenkins Plugin Modernizer Dashboard](https://rahulBadda08.github.io/jenkins-plugin-modernizer-dashboard/)**

---

## 🎯 Project Goals
An independent community project inspired by the [Jenkins GSoC 2026 "Plugin Modernizer Stats Visualization" Roadmap](https://www.jenkins.io/projects/gsoc/2026/project-ideas/plugin-modernizer-stats-visualization/):
- **Build-Time Ingestion**: Fetches and validates raw plugin reports from `jenkins-infra/metadata-plugin-modernizer` at build time to provide an instant, statically hosted web experience with zero backend dependencies.
- **Actionable Intelligence**: Evaluates ecosystem-wide health scores and provides per-plugin diagnostic checklists (Parent POM, BOM alignment, Jenkins core baseline drift, CI validation).
- **Client-Side Analytical Engine**: Real-time multi-dimensional filtering, searching, and export capabilities.
- **Autonomous Operation**: Daily scheduled workflows sync ecosystem reports, run automated test suites, and publish updates.

---

## 🏛️ Architecture & System Design

The dashboard implements a **Domain-Driven Static Intelligence** architecture:

```
├── scripts/
│   └── fetchData.mjs          # Resilient data ingestion pipeline (credential fallback, deep validation, SHA-256)
├── src/
│   ├── assets/                # Localized vector logos & lazy-loaded architectural blueprints
│   ├── data/
│   │   ├── all_plugins.json   # Deterministically sorted aggregated plugin dataset
│   │   └── manifest.json      # Ingestion telemetry manifest bound by cryptographic datasetSha256
│   ├── domain/                # Decoupled, fully tested business logic
│   │   ├── types.ts           # Strict TypeScript interfaces & status union types
│   │   ├── validation.ts      # Runtime schema validation & status normalizers
│   │   ├── migrationPolicy.ts # Active migration selection policy (timestamp-descending) & empty fallbacks
│   │   ├── baselineParser.ts  # Jenkins core baseline drift & obsolescence calculator
│   │   ├── scoring.ts         # Multi-factor health scoring & multi-key security analysis
│   │   ├── selectors.ts       # Pure filtering & analytical selection engine
│   │   └── security.ts        # Strict shell allowlist, HTML escaping, and CSV sanitization
│   ├── components/            # UI components (BarChart, PieChart, DataExplorer, ErrorBoundary)
│   ├── Dashboard.tsx          # Main analytical workbench, WAI-ARIA roving tabs & telemetry view
│   └── global.css             # Theme tokens, keyboard focus visibility & reduced motion support
└── .github/workflows/
    ├── deploy-pages.yml       # Canonical CI/CD pipeline with automated Quality Gates & .nvmrc resolution
    └── sync-plugin-data.yml   # Concurrency-safe data ingestion, rebase loop, summary table & deployment
```

### Ingestion Pipeline Hardening
- **Credential Resilience & Public Fallback**: When environment tokens (`GITHUB_TOKEN` / `GH_TOKEN`) return HTTP 401 or 403 on public repository endpoints (e.g. `raw.githubusercontent.com` or Tree API), the ingestion pipeline automatically retries unauthenticated for public access and dynamically drops invalid credentials for subsequent batch requests.
- **Deep Migration Validation**: Enforces non-negative integers for additions, deletions, and changed files, normalizes status values, validates pull request URLs, and filters corrupt entries while preserving baseline metadata (`jenkinsBaseline`, `targetBaseline`, `effectiveBaseline`, `migrationDescription`, `migrationId`).
- **Duplicate Plugin Rejection**: Tracks encountered plugins and rejects duplicate names to ensure deterministic ordering and prevent collision attacks.
- **Cryptographic Binding**: Computes a SHA-256 hash (`datasetSha256`) of the serialized dataset and embeds it directly into `manifest.json`.
- **Atomic Rollback**: Staged temporary writes with synchronized backups ensure previous data remains untouched if downloads fall below the 95% success threshold.

### Baseline Drift Radar
- A dedicated **Baseline Drift Radar** in the **Global Overview** tab segments plugins into:
  - `Critical Legacy (<2.440)`: Below minimum modernization runtime baseline
  - `Needs LTS Upgrade (2.440-2.579)`: Meets minimum baseline, but behind current 2026 LTS (2.580.2)
  - `Aligned (>=2.580)`: Aligned with current Jenkins LTS baseline expectations
  - `Unspecified / Missing`: Unreported core telemetry
- Evaluates baseline fields (`jenkinsVersion`, `effectiveBaseline`, `jenkinsBaseline`, `targetBaseline`) with safe fallbacks for incomplete records.
- Clicking a radar segment opens **Data Explorer** with that baseline cohort pre-filtered, while the companion chart highlights the highest drift targets for direct plugin drill-down.

---

## 📊 Health Scoring & Telemetry Semantics

Each plugin's health score is calculated on a scale of **5 to 100** by evaluating its active migration telemetry:

$$\text{Health Score} = 100 - \sum \text{Penalties}$$

### Evaluation Deductions
1. **Migration Outcome**:
   - `FAILURE`: -30 points
   - `ABORTED`: -20 points
   - `PENDING` / `RUNNING`: -10 points
   - `UNKNOWN`: -5 points
2. **CI Check Runs**:
   - Explicit Failure: -25 points
   - Missing / Unreported Telemetry: -5 points *(avoids misclassifying unreported CI as fatal failure)*
3. **Deprecation & Architecture**:
   - Tagged `deprecated`: -20 points
   - BOM Alignment Failed: -15 points (unaligned / unreported: -5 points)
4. **Maintenance Activity**:
   - Pull Request Closed without Merge: -15 points
   - Unreported PR status: -5 points
5. **Jenkins Baseline Version Drift**:
   - Jenkins Core below minimum supported threshold (`< 2.440`): -20 points
   - Unspecified / Unparseable version: -5 points *(flagged as `unspecified` rather than false `critical`)*

---

## 🛡️ Security Hardening

- **Strict Shell Identifier Validation**: `isSafeShellArg()` enforces a strict allowlist pattern (`/^[a-zA-Z0-9._-]+$/`). Refuses command generation on malformed or malicious identifiers, outputting security advisories instead of silently stripping characters into unintended repository targets.
- **Advisory Command Headers**: All generated remediation shell scripts prepend `SHELL_ADVISORY_HEADER`, emphasizing that generated commands are automated recommendations requiring local review before execution.
- **Multi-Key Security & CVE Detection**: Evaluates all check-run entries containing `security` or `cve` case-insensitively. Any failed security check flags the plugin as `Vulnerabilities` (`#EF4444`) and triggers a `danger` severity status. Plugins are marked `Secured` only when all security checks pass.
- **XSS Mitigation & React Formatting**: All user-controlled and upstream telemetry strings rendered in tooltips are sanitized via `escapeHtml()`. Inline code formatting in methodology descriptions parses directly to semantic React elements, eliminating `dangerouslySetInnerHTML`.
- **CSV Formula Injection Defense**: Spreadsheet export fields are sanitized via `sanitizeCsvCell()` to neutralize execution of formulas (`=`, `+`, `-`, `@`, `\t`, `\r`) in Excel / Calc.
- **Asset Localization**: Official Jenkins vector logo is stored locally in `src/assets/jenkins-logo.svg`, removing external third-party CDN runtime dependencies.
- **Memory Safety**: Object URLs created during client-side exports are explicitly released via `URL.revokeObjectURL()`.
- **Automated CI Dependency Audit**: `npm audit --omit=dev --audit-level=high` runs automatically in CI quality gates, ensuring zero high/critical vulnerabilities.

---

## ♿ Accessibility & User Experience

- **WAI-ARIA Roving TabIndex**: Tab switcher implements full WAI-ARIA tab pattern with roving `tabIndex={0 | -1}` and arrow-key navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`) with programmatic DOM focus.
- **Explicit TabPanels**: Each view is wrapped in a dedicated container with matching `id`, `role="tabpanel"`, and `aria-labelledby`.
- **Interactive Element Semantics**: Clickable overview cards and floating tray controls feature `role="button"`, `tabIndex={0}`, keyboard event handlers (`Enter` / `Space`), and descriptive `aria-label` tags.
- **Lazy-Loaded Graphics**: Heavy architectural blueprints utilize `loading="lazy"` and `decoding="async"` to prevent blocking initial viewport rendering.
- **Reduced Motion**: Full support for `@media (prefers-reduced-motion: reduce)`, pausing kinetic marquees and eliminating heavy animations for sensitive users.
- **Keyboard Focus**: Prominent `:focus-visible` outline rings across all interactive controls.

---

## 🛠️ Local Development & Quality Gates

### Prerequisites
- **Node.js**: Defined in `.nvmrc` (v24.x)
- **npm**: v10.x or higher

### Installation & Setup
```bash
# Clone the repository
git clone https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard.git
cd jenkins-plugin-modernizer-dashboard

# Use pinned Node version
nvm use

# Install clean dependencies
npm ci

# (Optional) Set GITHUB_TOKEN for higher rate limits during data ingestion
export GITHUB_TOKEN="ghp_yourTokenHere"

# Fetch ecosystem data and start local development server
npm run dev
```

### Automated Quality Verification
Before submitting changes, ensure all quality gates pass:

```bash
# 1. Run Vitest automated unit tests (59 tests across domain, security, & ingestion)
npm test

# 2. Run TypeScript strict typechecking
npx tsc -b

# 3. Run ESLint across all source files
npx eslint .

# 4. Run dependency security audit
npm audit --omit=dev --audit-level=high

# 5. Compile production build
npm run build
```

---

## 🔄 CI/CD Workflows

1. **`deploy-pages.yml` (Canonical Deployment)**:
   - Triggers on every push to `main` and via `workflow_dispatch`.
   - Executes automated Quality Gates (`npm audit`, `eslint`, `tsc`, `vitest`).
   - Resolves runtime version via `.nvmrc` and compiles production assets to GitHub Pages using pinned actions.
2. **`sync-plugin-data.yml` (Scheduled Ingestion & Autonomous Deployment)**:
   - Runs daily at Midnight UTC (`0 0 * * *`).
   - Downloads 400+ plugin reports, enforces a 95% minimum success threshold, produces atomic datasets with SHA-256 manifest, and commits changes.
   - Concurrency resilience: Rebases against `origin/main` before pushing with a bounded retry loop to prevent push race contention.
   - Telemetry reporting: Emits a formatted Markdown summary table to `$GITHUB_STEP_SUMMARY` on every run.
   - Automatically builds and deploys to GitHub Pages directly within the workflow whenever new data is committed.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

*An independent community project inspired by the Jenkins GSoC 2026 Plugin Modernizer Stats Visualization project idea.*
