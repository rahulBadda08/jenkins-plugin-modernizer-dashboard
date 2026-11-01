# Jenkins Plugin Modernizer Dashboard

[![Deploy Dashboard](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/deploy-pages.yml)
[![CI Verification](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/ci.yml)
[![Sync Ecosystem Data](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/sync-plugin-data.yml/badge.svg)](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/sync-plugin-data.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A high-fidelity, public analytics dashboard for visualizing the health, modernization velocity, and architectural alignment of the Jenkins plugin ecosystem. This platform consumes telemetry produced by the [Jenkins Plugin Modernizer Tool](https://github.com/jenkins-infra/plugin-modernizer-tool) and surfaces actionable remediation pathways for plugin maintainers and community contributors.

## 🚀 Live Dashboard
**[View the Jenkins Plugin Modernizer Dashboard](https://rahulBadda08.github.io/jenkins-plugin-modernizer-dashboard/)**

---

## 🎯 Project Goals
An independent community project inspired by the [Jenkins GSoC 2026 "Plugin Modernizer Stats Visualization" Roadmap](https://www.jenkins.io/projects/gsoc/2026/project-ideas/plugin-modernizer-stats-visualization/):
- **Reproducible Build-Time Ingestion**: Fetches and validates raw plugin reports from `jenkins-infra/metadata-plugin-modernizer` at build time. Local `dev` and `build` commands operate deterministically offline with zero runtime API or backend dependencies.
- **Actionable Intelligence**: Evaluates ecosystem-wide health scores and provides per-plugin diagnostic checklists (Parent POM, BOM alignment, Jenkins core baseline drift, CI validation, CVE/security scans).
- **Client-Side Analytical Engine**: Real-time multi-dimensional filtering, searching, and spreadsheet exports (Excel XLSX, CSV, JSON).
- **Autonomous Operation**: Daily scheduled workflows sync ecosystem reports, run automated quality gates, and publish updates with commit SHA concurrency tracking.

---

## 🏛️ Architecture & System Design

The dashboard implements a **Domain-Driven Static Intelligence** architecture:

```
├── scripts/
│   ├── fetchData.mjs          # Resilient data ingestion pipeline (credential fallback, deep validation, SHA-256)
│   └── verifyData.mjs         # Standalone cryptographic dataset integrity & schema verification script
├── docs/                      # In-depth architectural & security specifications
│   ├── architecture.md        # Component architecture & multi-panel lifecycle
│   ├── security.md            # Command injection defenses & sanitization rules
│   └── data_pipeline.md       # Ingestion retry matrix & rollback specifications
├── src/
│   ├── assets/                # Localized vector logos & lazy-loaded architectural blueprints
│   ├── data/
│   │   ├── all_plugins.json   # Deterministically sorted aggregated plugin dataset
│   │   └── manifest.json      # Ingestion telemetry manifest bound by cryptographic datasetSha256
│   ├── domain/                # Decoupled, 100% test-covered business logic
│   │   ├── types.ts           # Strict TypeScript interfaces & status union types
│   │   ├── validation.ts      # Runtime schema validation & status normalizers
│   │   ├── migrationPolicy.ts # Active migration selection policy (timestamp-descending) & empty fallbacks
│   │   ├── baselineParser.ts  # SemVer parser, patch comparison (2.440.3 / 2.580.2), and baseline drift
│   │   ├── checkClassification.ts # Centralized check-run aggregator (BOM, Parent, CI, CVE)
│   │   ├── scoring.ts         # Multi-factor health scoring & multi-key security analysis
│   │   ├── selectors.ts       # Pure filtering & centralized workbench cohort selection
│   │   └── security.ts        # Shell allowlist, URL validator, and CSV formula sanitization
│   ├── application/
│   │   └── remediation/
│   │       └── generateMasterScript.ts # Pure bash orchestration script generator
│   ├── components/            # Accessible, modular UI components
│   │   ├── DashboardTabs.tsx  # WAI-ARIA tablist with roving tabIndex & keyboard navigation
│   │   ├── WorkbenchPanel.tsx # Strategic workbench console & prioritized task cards
│   │   ├── MethodologyPanel.tsx # Visual engineering pipeline & telemetry specification
│   │   ├── SurgeryTray.tsx    # Floating orchestration terminal with non-nested controls
│   │   ├── DataExplorer.tsx   # Searchable, filterable data explorer with XLSX/CSV/JSON exports
│   │   ├── BarChart.tsx       # Apache ECharts bar visualization with screen-reader table fallbacks
│   │   ├── PieChart.tsx       # Distribution pie charts with custom renderers
│   │   └── ErrorBoundary.tsx  # React error boundary for UI resilience
│   ├── Dashboard.tsx          # Main analytical workbench orchestrating persistent tabpanels
│   └── global.css             # Theme tokens, keyboard focus visibility & reduced motion support
└── .github/workflows/
    ├── deploy-pages.yml       # Production deployment with Quality Gates & .nvmrc resolution
    ├── ci.yml                 # Dedicated PR verification quality gate (no deployment)
    └── sync-plugin-data.yml   # Scheduled ingestion, rebase loop, deploy_sha tracking, and summary table
```

### Ingestion Pipeline Hardening
- **Credential Resilience & Public Fallback**: When environment tokens (`GITHUB_TOKEN` / `GH_TOKEN`) return HTTP 401 or 403 on public repository endpoints (e.g. `raw.githubusercontent.com` or Tree API), the ingestion pipeline automatically retries unauthenticated for public access and dynamically drops invalid credentials for subsequent batch requests.
- **Permanent Error Defense**: Permanent HTTP client errors (`400`, `404`, `422`, and rate-limit exhausted `403`) are never retried. Retries are strictly reserved for transient errors (`408`, `429`, and `5xx`).
- **Deep Migration Validation**: Enforces non-negative integers for additions, deletions, and changed files, normalizes status values, validates pull request URLs, and filters corrupt entries while preserving baseline metadata (`jenkinsBaseline`, `targetBaseline`, `effectiveBaseline`, `migrationDescription`, `migrationId`).
- **Case-Insensitive Duplicate Rejection**: Tracks encountered plugins case-insensitively to ensure deterministic ordering and prevent collision attacks.
- **Cryptographic Binding & Verification**: Computes a SHA-256 hash (`datasetSha256`) of the serialized dataset and embeds it directly into `manifest.json`. The independent `scripts/verifyData.mjs` script verifies the checksum on every CI run.
- **Atomic Rollback**: Staged temporary writes with synchronized backups ensure previous data remains untouched if downloads fall below the 95% success threshold.

### SemVer Jenkins Baseline Comparison
- Full `major.minor.patch` SemVer comparator accurately classifies baseline boundaries:
  - **Critical Legacy (`< 2.440.3`)**: Below minimum supported modernization runtime baseline (e.g., `2.440.2` is correctly classified as Critical).
  - **Needs LTS Upgrade (`2.440.3` – `2.580.1`)**: Meets minimum baseline, but behind current 2026 LTS baseline (`2.580.2`).
  - **Aligned (`>= 2.580.2`)**: Fully aligned with current Jenkins LTS baseline expectations.
  - **Unspecified / Missing**: Unreported core telemetry.

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
   - Parent POM Failed: -10 points
4. **Maintenance Activity**:
   - Pull Request Closed without Merge: -15 points
   - Unreported PR status: -5 points
5. **Jenkins Baseline Version Drift**:
   - Jenkins Core below minimum supported threshold (`< 2.440.3`): -20 points
   - Unspecified / Unparseable version: -5 points

---

## 🛡️ Security Hardening

- **Strict Shell Identifier Validation**: `isSafeShellArg()` enforces a strict allowlist pattern (`/^[a-zA-Z0-9._-]+$/`). Refuses command generation on malformed or malicious identifiers, outputting security advisories instead of silently rewriting characters into unintended targets.
- **Advisory Command Headers**: All generated remediation shell scripts prepend `SHELL_ADVISORY_HEADER`, emphasizing that generated commands are automated recommendations requiring maintainer review before execution.
- **URL Protocol & Credential Defense**: All external URLs are validated using `isValidExternalUrl()`. Embedded credentials (`user:pass@`) and non-HTTP protocols (`javascript:`, `data:`, `file:`) are rejected.
- **Multi-Key Security & CVE Detection**: Evaluates all check-run entries containing `security`, `cve`, or `vulnerability` case-insensitively. Any failed security check flags the plugin as `Vulnerabilities` and triggers a `danger` severity status.
- **CSV Formula Injection Defense**: Spreadsheet export fields are sanitized via `sanitizeCsvCell()` to neutralize execution of formulas (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`, `|`).
- **Asset Localization**: Official Jenkins vector logo is stored locally in `src/assets/jenkins-logo.svg`, removing third-party CDN runtime dependencies.
- **Automated Dependency Auditing**: `npm audit --omit=dev --audit-level=high` runs in CI quality gates, guaranteeing zero high/critical vulnerabilities.

---

## ♿ Accessibility & User Experience

- **Persistent Multi-Panel Architecture**: All four primary tabpanels (`panel-overview`, `panel-workbench`, `panel-explorer`, `panel-methodology`) remain permanently mounted in the DOM using `hidden={currentlyActiveTab !== targetTab}`, ensuring all `aria-controls` targets exist at all times.
- **WAI-ARIA Roving TabIndex**: Tab switcher implements full WAI-ARIA tab pattern with roving `tabIndex={0 | -1}` and arrow-key navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`) with programmatic DOM focus.
- **Accessible Dropdowns**: Filter dropdowns utilize semantic `<button>` triggers with `aria-haspopup="listbox"`, `aria-expanded`, and keyboard handling (`Enter`, `Space`, `Escape`).
- **Zero Nested Interactive Controls**: Floating surgery queue items separate drilldown buttons and remove buttons into distinct siblings, eliminating nested `<button>` violations.
- **Screen-Reader Visual Alternatives**: `BarChart.tsx` includes semantic `role="region"` with accessible summary data lists for assistive technologies.
- **Reduced Motion**: Full support for `@media (prefers-reduced-motion: reduce)`, pausing kinetic marquees and eliminating heavy animations.

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

# Start local development server (runs offline with bundled dataset)
npm run dev
```

### Quality Verification Scripts
```bash
# Run complete quality gate (lint, typecheck, vitest, data:verify, build)
npm run check

# Or run individual verification steps:
npm run lint          # Run ESLint across all source files
npm run typecheck     # Run TypeScript strict typechecking (tsc -b)
npm test              # Run Vitest unit tests (82 tests across 8 suites)
npm run data:verify   # Verify dataset cryptographic checksum and schema
npm run build         # Compile production build
```

---

## 🔄 CI/CD Workflows

1. **`ci.yml` (Dedicated PR Quality Gate)**:
   - Triggers on every pull request to `main`.
   - Executes `npm audit`, `eslint`, `tsc`, `vitest`, `data:verify`, and `vite build` without deploying.
2. **`deploy-pages.yml` (Production Deployment)**:
   - Triggers on push to `main` and compiles production assets to GitHub Pages.
3. **`sync-plugin-data.yml` (Scheduled Ingestion & Autonomous Deployment)**:
   - Runs daily at Midnight UTC (`0 0 * * *`).
   - Downloads 400+ plugin reports, enforces a 95% minimum success threshold, produces atomic datasets with SHA-256 manifest, and commits changes.
   - Outputs refreshed `deploy_sha` and passes it to the deployment job, eliminating checkout race conditions.
   - Emits a Markdown telemetry summary table to `$GITHUB_STEP_SUMMARY`.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

*An independent community project inspired by the Jenkins GSoC 2026 Plugin Modernizer Stats Visualization project idea.*
