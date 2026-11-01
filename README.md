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

## 🛡️ DevOps & Engineering Controls

| Area | Status | Implementation & Specifications |
|---|---|---|
| **CI Quality Gates** | ✅ **Enforced** | `ci.yml` and `deploy-pages.yml` running ESLint, `tsc -b`, Vitest, `verifyData.mjs`, Vite build, and `budget:check`. |
| **Scheduled Data Pipeline** | ✅ **Enforced** | Daily midnight UTC sync (`sync-plugin-data.yml`), 95% threshold, atomic rollback, commit handoff, and step summary. |
| **Containerization** | ✅ **Enforced** | Multi-stage `Dockerfile` (`node:24-alpine` -> `nginx:alpine` unprivileged), `nginx.conf`, `.dockerignore`, `docker-compose.yml`. |
| **Jenkins Pipeline** | ✅ **Enforced** | Declarative `Jenkinsfile` with parallel lint/typecheck, supply chain audit, unit tests, and dataset verification. |
| **Dependency Automation** | ✅ **Enforced** | `.github/dependabot.yml` maintaining weekly updates for `npm` packages and GitHub Actions. |
| **Security Scanning & SAST** | ✅ **Enforced** | GitHub CodeQL (`codeql.yml`), `actions/dependency-review-action` on PRs, and immutable 40-character SHA-pinned actions. |
| **PR Preview Deployments** | ✅ **Enforced** | `pr-preview.yml` builds PR bundles, checks performance budgets, and publishes preview artifacts with automatic PR commenting. |
| **E2E & Accessibility Tests** | ✅ **Enforced** | Playwright smoke suite (`e2e/smoke.spec.ts`) with `@axe-core/playwright` automated WCAG 2.1 AA accessibility checks. |
| **Performance Budgets** | ✅ **Enforced** | `scripts/checkBundleSize.mjs` (`budget:check`) enforcing raw and gzip size limits across all bundles in CI. |
| **Coverage Reporting** | ✅ **Enforced** | `@vitest/coverage-v8` with strict threshold gates (>75% branch coverage, >80% line coverage). |
| **Pipeline Failure Alerting** | ✅ **Enforced** | `sync-plugin-data.yml` auto-opens deduplicated GitHub Issues if daily data ingestion fails or drops below 95%. |
| **Synthetic Uptime Monitoring**| ✅ **Enforced** | `synthetic-monitoring.yml` 6-hour cron probe checking live URL response times, HTTP 200, and DOM integrity. |
| **Release Management** | ✅ **Enforced** | Semantic versioning (`v1.0.0`), annotated git tags, and automated GitHub Release publishing (`release.yml`). |
| **Repository Governance** | ✅ **Enforced** | `.github/CODEOWNERS`, `.editorconfig`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, and issue/PR templates. |
| **Infrastructure as Code (IaC)**| ✅ **Enforced** | Complete Terraform module in `terraform/` for Amazon S3 + CloudFront OAC + Security Headers deployment. |
| **Command Injection Defense** | ✅ **Enforced** | `isSafeShellArg()` enforces strict `/^[a-zA-Z0-9_-]+$/` allowlist with mandatory advisory headers before script generation. |
| **Spreadsheet Sanitization** | ✅ **Enforced** | `sanitizeCsvCell()` neutralizes formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`, `|`) in CSV and Excel exports. |
| **URL Sanitization & Defense** | ✅ **Enforced** | `isValidExternalUrl()` and `sanitizeExternalUrl()` reject non-HTTP schemes (`javascript:`, `data:`, `file:`) and embedded credentials (`user:pass@`). |

### 🔒 Application Security & Input Sanitization
- **URL Sanitization & Credential Defense**: Every external link (repository URLs, issues links, pull requests) is validated using `isValidExternalUrl()` and sanitized with `sanitizeExternalUrl()` in `src/domain/security.ts`. Embedded user credentials (`user:pass@`), non-HTTP schemes (`javascript:`, `data:`, `file:`), and malformed hosts are rejected. Unsafe links are automatically neutralized and suppressed by security policy in both the UI and export layers.
- **Strict Shell Identifier Allowlist**: `isSafeShellArg()` validates plugin names against `/^[a-zA-Z0-9_-]+$/` before generating advisory remediation bash scripts. Input failing validation produces explicit warning comments rather than silently mutating names.
- **Spreadsheet Formula Injection Defense**: `sanitizeCsvCell()` neutralizes execution of formulas in Excel and CSV exports by prepending a single quote to triggers (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`, `|`).

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
npm test               # Vitest unit test suite (84 tests)
npm run test:coverage  # Vitest V8 code coverage report with enforced thresholds (>75% branches, >80% lines)
npm run test:e2e       # Playwright E2E smoke and axe-core accessibility tests
npm run data:verify    # Dataset SHA-256 and schema verification
npm run build          # Production bundle compilation (Vite 8 Rolldown)
npm run budget:check   # Performance budget verification (raw and gzip thresholds)
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
