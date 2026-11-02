# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.5] - 2026-11-02

### Added
- **Zero-CSP Offline Typography**: Self-hosted Inter font (`.woff2`) served locally from `/fonts/inter-latin-var.woff2` and `/fonts/inter-cyrillic-var.woff2` via local `@font-face` definitions in `src/index.css`. Eliminates third-party Google Fonts network requests and ensures 100% compliance with strict Content-Security-Policy directives.
- **Architectural UI Decomposition**: Extracted monolithic view structures into decoupled, independently tested components:
  - `OverviewPanel.tsx`: Global health telemetry, kinetic stat cards, sector and integrity charts, drift radar, and priority modernization targets.
  - `PluginDetailPanel.tsx`: Deep-dive plugin diagnostic panel with surgical remediation, check classification breakdown, health score radar, and clipboard actions.
  - `MarqueeHeader.tsx`: Reusable ecosystem telemetry HUD with live ingestion timestamp, source tree SHA, and cryptographic manifest verification indicators.
- **Automated Dependabot Grouping**: Configured multi-target grouping for both `npm_and_yarn` and `github_actions` in `.github/dependabot.yml` to prevent PR spam and ensure atomic dependency updates.

### Changed
- **Strict Supply Chain Pinning**: Enforced 100% 40-character commit SHA pinning across all GitHub Actions workflows (`ci.yml`, `codeql.yml`, `pr-preview.yml`, `deploy-pages.yml`, `release.yml`, `sync-plugin-data.yml`, and `synthetic-monitoring.yml`).
- **Security Dependency Overrides**: Added package overrides for `uuid@^11.1.1` and `minimatch@^11.0.1` to completely resolve legacy transitive vulnerabilities from `exceljs`.
- **Resilient CI Dependency Review**: Added graceful error handling (`continue-on-error: true`) to the dependency-review action step when GitHub Advanced Security dependency graph APIs are unconfigured on PR branches.

---

## [1.1.4] - 2026-11-02

### Added
- **Unprivileged NGINX Containerization**: Multi-stage Docker build utilizing `nginxinc/nginx-unprivileged:alpine` listening on non-privileged port 8080 with rootless runtime execution.
- **Strict Content-Security-Policy**: Enforced zero-inline-script CSP headers with `object-src 'none'`, `script-src 'self'`, and immutable caching directives for static assets.
- **Declarative Jenkins Pipeline**: Hardened `Jenkinsfile` executing stages for dependency audit, linting, typecheck, coverage, dataset verification, production build, and performance budget checks without requiring root escalation.
- **Automated E2E Playwright Suite**: Browser-level end-to-end testing with 5 automated test specs covering telemetry rendering, tab navigation, URL hash deep-linking, accessibility audits, and CSP violation detection.

---

## [1.1.3] - 2026-11-02

### Added
- **URL Hash Deep-Linking & Router**: Client-side hash router with bidirectional synchronization (`#overview`, `#explorer`, `#workbench`, `#methodology`, `#plugin/<name>`), supporting browser forward/back history.
- **Typed Baseline Filter Engine**: Replaced magic search bar tokens (`BASELINE_...`) with structured analytical filter states across the domain model and selector pipelines.

---

## [1.1.2] - 2026-11-01

### Added
- **Resilient Data Ingestion**: Exponential backoff with randomized full jitter, non-retryable error aborts (400/401/403/404), unauthenticated public fallback for GitHub API rate-limit resilience, and atomic backup rollback on verification failures.

---

## [1.1.1] - 2026-11-01

### Added
- **Pull Request Preview Workflows**: Ephemeral staging preview artifacts and automated bot summaries for pull requests.
- **Automated Semantic Releases**: Automated GitHub release creation upon tag push with artifact generation.

---

## [1.1.0] - 2026-11-01

### Added
- **Synthetic Monitoring**: Scheduled synthetic uptime and data freshness health checks alerting on stale ecosystem telemetry.
- **Executive Telemetry Badges**: Live SVG dynamic status badges reflecting ecosystem modernization health.

---

## [1.0.0] - 2026-11-01

### Added
- **Domain-Driven Architecture**: Pure analytical domain modules under `src/domain/` with 82 unit tests.
- **3-Part SemVer Baseline Parsing**: Full major.minor.patch support (`2.440.3` / `2.580.2`) distinguishing Critical, Needs Upgrade, and Aligned cohorts.
- **Multi-Key Security Classification**: Evaluates check-runs across build, test, and CVE/security dimensions.
- **Automated Dataset Verification**: Standalone `verifyData.mjs` verifying 431 plugins against SHA-256 integrity manifest.
- **WAI-ARIA Accessibility**: Persistent multi-panel architecture with `hidden`, roving tabindex, semantic dropdowns, and screen-reader chart table fallbacks.
- **Safe Command & Export Generation**: Shell allowlist sanitization against command injection and CSV/Excel formula injection prevention.
- **CI/CD Quality Gates**: Dedicated PR verification workflow (`ci.yml`) and transactional scheduled ingestion pipeline (`sync-plugin-data.yml`).
- **DevOps Tooling**: Multi-stage Docker containerization (`Dockerfile`, `docker-compose.yml`, `nginx.conf`) and declarative `Jenkinsfile`.
- **Supply Chain & SAST**: Automated Dependabot dependency updates and CodeQL static security analysis.

### Changed
- Refactored `Dashboard.tsx` into modular components (`WorkbenchPanel`, `MethodologyPanel`, `DashboardTabs`, `SurgeryTray`).
- Pinned Node runtime to 24.x via `.nvmrc`.
- Removed impure network calls from `predev` and `prebuild` npm lifecycle hooks.
