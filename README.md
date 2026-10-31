# Jenkins Plugin Modernizer Dashboard

[![Deploy Dashboard](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/deploy-pages.yml)
[![Sync Ecosystem Data](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/sync-plugin-data.yml/badge.svg)](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/sync-plugin-data.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A high-fidelity, public analytics dashboard for visualizing the health, modernization velocity, and architectural alignment of the Jenkins plugin ecosystem. This platform consumes telemetry produced by the [Jenkins Plugin Modernizer Tool](https://github.com/jenkins-infra/plugin-modernizer-tool) and surfaces actionable remediation pathways for plugin maintainers and community contributors.

## 🚀 Live Dashboard
**[View the Jenkins Plugin Modernizer Dashboard](https://rahulBadda08.github.io/jenkins-plugin-modernizer-dashboard/)**

---

## 🎯 Project Goals (GSoC 2026)
This project is built following the [Jenkins GSoC 2026 "Plugin Modernizer Stats Visualization" Roadmap](https://www.jenkins.io/projects/gsoc/2026/project-ideas/plugin-modernizer-stats-visualization/):
- **Build-Time Ingestion**: Fetches and validates raw plugin reports from `jenkins-infra/metadata-plugin-modernizer` at build time to provide an instant, statically hosted web experience with zero backend dependencies.
- **Actionable Intelligence**: Evaluates ecosystem-wide health scores and provides per-plugin diagnostic checklists (Parent POM, BOM alignment, Jenkins core baseline drift, CI validation).
- **Client-Side Analytical Engine**: Real-time multi-dimensional filtering, searching, and export capabilities.
- **Autonomous Operation**: Daily scheduled workflows sync ecosystem reports, run automated test suites, and publish updates.

---

## 🏛️ Architecture & System Design

The dashboard implements a **Domain-Driven Static Intelligence** architecture:

```
├── scripts/
│   └── fetchData.mjs          # Resilient data ingestion pipeline (rate-limiting, atomic writes, manifest)
├── src/
│   ├── data/
│   │   ├── all_plugins.json   # Deterministically sorted aggregated plugin dataset
│   │   └── manifest.json      # Ingestion telemetry manifest (commit SHA, timestamp, counts)
│   ├── domain/                # Decoupled, fully tested business logic
│   │   ├── types.ts           # Strict TypeScript interfaces & status union types
│   │   ├── validation.ts      # Runtime schema validation & status normalizers
│   │   ├── migrationPolicy.ts # Active migration selection policy (timestamp-descending)
│   │   ├── baselineParser.ts  # Jenkins core baseline drift & obsolescence calculator
│   │   ├── scoring.ts         # Multi-factor health scoring & diagnostic insights
│   │   ├── selectors.ts       # Pure filtering & analytical selection engine
│   │   └── security.ts        # HTML entity escaping, CSV sanitization, and shell argument protection
│   ├── components/            # UI components (BarChart, PieChart, DataExplorer, ErrorBoundary)
│   ├── Dashboard.tsx          # Main analytical workbench & telemetry view
│   └── global.css             # Theme tokens, keyboard focus visibility & reduced motion support
└── .github/workflows/
    ├── deploy-pages.yml       # Canonical CI/CD pipeline with automated Quality Gates
    └── sync-plugin-data.yml   # Scheduled nightly data ingestion & commit automation
```

### Baseline Drift Radar
- A dedicated **Baseline Drift Radar** in the **Global Overview** tab segments plugins into:
  - `Critical Legacy (<2.440)`
  - `Needs LTS Upgrade (2.440-2.451)`
  - `Aligned (>=2.452)`
- The radar evaluates baseline fields (`jenkinsVersion`, `effectiveBaseline`, `jenkinsBaseline`, `targetBaseline`) with safe fallbacks for incomplete records.
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
   - BOM Alignment Failed: -15 points (unaligned: -5 points)
4. **Maintenance Activity**:
   - Pull Request Closed without Merge: -15 points
   - Unreported PR status: -5 points
5. **Jenkins Baseline Version Drift**:
   - Jenkins Core below current LTS threshold (`< 2.440`): -20 points
   - Unspecified / Unparseable version: -5 points *(flagged as `unspecified` rather than false `critical`)*

---

## 🛡️ Security Hardening

- **XSS Mitigation in Tooltips**: All user-controlled and upstream telemetry strings rendered in Apache ECharts tooltips are sanitized via `escapeHtml()`.
- **CSV Formula Injection Defense**: Spreadsheet export fields are sanitized via `sanitizeCsvCell()` to neutralize execution of formulas (`=`, `+`, `-`, `@`, `\t`, `\r`) in Excel / Calc.
- **Command Sanitization**: Auto-generated CLI remediation scripts sanitize repository and plugin names (`sanitizeShellArg()`) to prevent shell injection.
- **Memory Safety**: Object URLs created during JSON and CSV client-side exports are explicitly released via `URL.revokeObjectURL()`.

---

## ♿ Accessibility & User Experience

- **Keyboard Focus**: Prominent `:focus-visible` outline rings across all interactive controls.
- **Reduced Motion**: Full support for `@media (prefers-reduced-motion: reduce)`, pausing kinetic marquees and eliminating heavy animations for sensitive users.
- **Screen Reader Support**: Accessible `role="tablist"` / `role="tab"` attributes with `aria-selected`, and explicit `aria-label` tags on all icon controls.
- **Native Cursor Restored**: Standard system mouse cursor behavior restored across all views.

---

## 🛠️ Local Development & Quality Gates

### Prerequisites
- **Node.js**: v24.x or higher
- **npm**: v10.x or higher

### Installation & Setup
```bash
# Clone the repository
git clone https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard.git
cd jenkins-plugin-modernizer-dashboard

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
# 1. Run Vitest automated unit tests (domain logic & security checks)
npm test

# 2. Run TypeScript strict typechecking
npx tsc -b

# 3. Run ESLint across all source files
npx eslint .

# 4. Compile production build
npm run build
```

---

## 🔄 CI/CD Workflows

1. **`deploy-pages.yml` (Canonical Deployment)**:
   - Triggers on every push to `main` and via `workflow_dispatch`.
   - Executes automated Quality Gates (`eslint`, `tsc`, `vitest`).
   - Compiles production assets and publishes to GitHub Pages using pinned actions.
2. **`sync-plugin-data.yml` (Scheduled Ingestion)**:
   - Runs daily at Midnight UTC (`0 0 * * *`).
   - Downloads 400+ plugin reports, enforces a 95% minimum success threshold, produces atomic datasets + manifest, and commits changes.
   - Pushing the new commit automatically triggers `deploy-pages.yml` without duplicate deployments or race conditions.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

*Part of the Jenkins GSoC 2026 Initiative.*
