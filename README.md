# Jenkins Plugin Modernizer Dashboard

[![CI Verification](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/ci.yml)
[![Deploy Dashboard](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/deploy-pages.yml)
[![Sync Ecosystem Data](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/sync-plugin-data.yml/badge.svg)](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/sync-plugin-data.yml)
[![CodeQL Security](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/codeql.yml/badge.svg)](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A client-side static analytics dashboard for visualizing modernization status, core baseline alignment, and health metrics across the Jenkins plugin ecosystem. The platform ingests report data from the [Jenkins Plugin Modernizer Tool](https://github.com/jenkins-infra/plugin-modernizer-tool) metadata repository (`jenkins-infra/metadata-plugin-modernizer`) and provides structured remediation guidance for plugin maintainers.

## 🚀 Live Dashboard
**[https://rahulbadda08.github.io/jenkins-plugin-modernizer-dashboard/](https://rahulbadda08.github.io/jenkins-plugin-modernizer-dashboard/)**

---

## 🎯 Project Context & Ecosystem Relationship

This is an **independent community project** inspired by the [Jenkins GSoC 2026 "Plugin Modernizer Stats Visualization" Roadmap](https://www.jenkins.io/projects/gsoc/2026/project-ideas/plugin-modernizer-stats-visualization/):

- **Distinct from Upstream Implementation**: The official GSoC 2026 implementation is developed by Pratik Mane at [`jenkins-infra/plugin-modernizer-stats`](https://github.com/jenkins-infra/plugin-modernizer-stats). This repository serves as an independent, fully static exploration of modernization telemetry and remediation UX.
- **Relationship to Plugin Health Scoring**: The official Jenkins project [`jenkins-infra/plugin-health-scoring`](https://plugin-health.jenkins.io/) measures global plugin health across broad maintenance indicators. In contrast, this dashboard computes an opinionated **Modernization Readiness Score** focused specifically on active OpenRewrite recipe migrations (Parent POM updates, BOM dependency alignment, Jenkins core baseline drift, and check-run passes).
- **Deterministic Build-Time Ingestion**: Pulls 430+ plugin reports from `jenkins-infra/metadata-plugin-modernizer` at build time. Development and production compilation operate offline with zero backend or runtime API dependencies.
- **URL Deep-Linking**: Supports direct hashtag routing (e.g. `#/plugin/git`, `#/workbench`, `#/explorer`) allowing maintainers to share and bookmark individual plugin reports directly.

---

## 🏛️ Architecture & System Design

```
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Dedicated PR verification quality gate (no deployment)
│   │   ├── codeql.yml             # Automated CodeQL SAST security analysis
│   │   ├── deploy-pages.yml       # Production deployment with Quality Gates & .nvmrc
│   │   └── sync-plugin-data.yml   # Nightly ingestion, rollback, rebase loop & alert issue creation
│   ├── ISSUE_TEMPLATE/            # Standardized bug report and feature request templates
│   ├── PULL_REQUEST_TEMPLATE.md   # PR verification checklist
│   └── dependabot.yml             # Weekly automated supply-chain maintenance (npm + GitHub Actions)
├── Dockerfile                     # Multi-stage production container build (Node 24 -> Nginx Alpine)
├── docker-compose.yml             # Single-command local container orchestration with healthcheck
├── nginx.conf                     # Production Nginx reverse proxy configuration with security headers
├── Jenkinsfile                    # Declarative multi-stage Jenkins CI pipeline
├── scripts/
│   ├── fetchData.mjs              # Resilient data ingestion pipeline (credential fallback, backoff, jitter)
│   └── verifyData.mjs             # Standalone dataset schema & SHA-256 integrity verification
├── docs/                          # Detailed technical documentation
│   ├── architecture.md            # Component architecture & multi-panel lifecycle
│   ├── security.md                # Threat model & sanitization rules
│   └── data_pipeline.md           # Ingestion retry matrix & rollback specifications
├── src/
│   ├── data/
│   │   ├── all_plugins.json       # Deterministically sorted aggregated plugin dataset
│   │   └── manifest.json          # Ingestion telemetry manifest with datasetSha256
│   ├── domain/                    # Pure, test-covered business logic (83 Vitest tests, >75% coverage)
│   │   ├── types.ts               # Strict TypeScript interfaces & status union types
│   │   ├── validation.ts          # Runtime schema validation & status normalizers
│   │   ├── baselineParser.ts      # 3-part SemVer comparator (2.440.3 / 2.580.2)
│   │   ├── checkClassification.ts # Centralized check-run aggregator (BOM, Parent, CI, CVE)
│   │   ├── scoring.ts             # Multi-factor modernization scoring & CVE detection
│   │   ├── selectors.ts           # Pure filtering & workbench metrics calculation
│   │   └── security.ts            # Shell allowlist, URL validator, and CSV formula sanitization
│   ├── components/                # Accessible, modular UI components
│   │   ├── DashboardTabs.tsx      # WAI-ARIA tablist with roving tabIndex & deep-linking
│   │   ├── WorkbenchPanel.tsx     # Strategic workbench console & prioritized action queue
│   │   ├── MethodologyPanel.tsx   # Visual engineering pipeline & telemetry specification
│   │   ├── SurgeryTray.tsx        # Floating orchestration terminal with non-nested controls
│   │   ├── DataExplorer.tsx       # Searchable data explorer with XLSX/CSV/JSON exports
│   │   ├── BarChart.tsx           # Apache ECharts bar visualization with screen-reader table fallbacks
│   │   └── ErrorBoundary.tsx      # React error boundary for component resilience
│   └── Dashboard.tsx              # Main orchestrator managing persistent DOM tabpanels
```

---

## 🛡️ DevOps & Security Controls

| Category | Implementation | Description |
|---|---|---|
| **Containerization** | `Dockerfile` + `nginx.conf` | Multi-stage build (`node:24-alpine` builder, unprivileged `nginx:alpine` runner) with security headers and SPA fallback. |
| **Jenkins CI** | `Jenkinsfile` | Declarative pipeline mirroring all verification stages (`npm audit`, ESLint, `tsc`, Vitest, `verifyData`, build). |
| **Supply Chain** | `.github/dependabot.yml` | Weekly automated dependency update PRs for npm packages and GitHub Actions. |
| **SAST Scanning** | `.github/workflows/codeql.yml` | Weekly and PR-triggered CodeQL security scans for JavaScript/TypeScript. |
| **Pipeline Alerting** | `sync-plugin-data.yml` | Automatically creates a deduplicated GitHub Issue when nightly data ingestion drops below 95% or fails. |
| **Dataset Integrity** | `scripts/verifyData.mjs` | Verifies SHA-256 checksum embedded in `manifest.json` before allowing builds to complete. |
| **Command Injection Defense** | `isSafeShellArg()` | Validates plugin identifiers against `/^[a-zA-Z0-9_-]+$/` before generating advisory remediation bash scripts. |
| **Spreadsheet Sanitization** | `sanitizeCsvCell()` | Prepends single quotes to neutralizing spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`, `|`). |

---

## 📊 Modernization Scoring Model

Each plugin's Modernization Readiness Score is computed on a scale of **5 to 100**:

$$\text{Modernization Score} = 100 - \sum \text{Deductions}$$

### Penalty Weights & Rationale
1. **Migration Execution Status**:
   - `FAILURE`: -30 points *(Recipe execution could not produce a valid pull request)*
   - `ABORTED`: -20 points *(Migration process terminated prematurely)*
   - `PENDING` / `RUNNING`: -10 points *(Work in progress)*
   - `UNKNOWN`: -5 points *(Unreported execution state)*
2. **CI Check Runs**:
   - Failed CI check-run: -25 points *(Changes broke plugin build or tests)*
   - Unreported CI telemetry: -5 points *(Avoids misclassifying missing check data as fatal failure)*
3. **Architecture & Dependency Alignment**:
   - Deprecated plugin tag: -20 points
   - BOM Alignment Failed: -15 points *(Plugin does not leverage Jenkins BOM for dependency convergence)*
   - Parent POM Alignment Failed: -10 points
4. **Pull Request Lifecycle**:
   - Pull Request Closed without Merge: -15 points
   - Unreported PR status: -5 points
5. **Jenkins Core Baseline Drift**:
   - Critical Legacy (`< 2.440.3`): -20 points *(Incompatible with modern Jenkins runtime criteria)*
   - Unspecified / Unparseable version: -5 points

---

## 🛠️ Local Development & Quality Gates

### Prerequisites
- **Node.js**: `24.x` (see [`.nvmrc`](.nvmrc))
- **npm**: `10.x` or higher
- **Docker** (optional, for containerized execution)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard.git
cd jenkins-plugin-modernizer-dashboard
nvm use
npm ci

# Launch development server
npm run dev
```

### Full Quality Gate
```bash
# Run all quality checks (ESLint, TypeScript, Vitest with coverage, data verification, build)
npm run check
```

Individual commands:
```bash
npm run lint           # ESLint static analysis
npm run typecheck      # TypeScript compilation check (tsc -b)
npm test               # Vitest unit test suite (83 tests)
npm run test:coverage  # Vitest V8 code coverage report with enforced thresholds (>75% branches, >80% lines)
npm run data:verify    # Dataset SHA-256 and schema verification
npm run build          # Production bundle compilation (Vite 8 Rolldown)
```

---

## 🐳 Running with Docker

### Using Docker Compose
```bash
# Build and run the containerized dashboard
docker compose up -d

# Open in browser: http://localhost:8080
# View container health status:
docker compose ps
```

### Manual Docker Build
```bash
docker build -t jenkins-modernizer-dashboard .
docker run -p 8080:80 --rm jenkins-modernizer-dashboard
```

---

## 📄 Governance & Contributing
- [Contributing Guidelines](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [License (MIT)](LICENSE)

*An independent community exploration inspired by the Jenkins GSoC 2026 Plugin Modernizer Stats Visualization project idea.*
