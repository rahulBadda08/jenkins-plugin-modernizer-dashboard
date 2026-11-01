# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
