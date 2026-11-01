# Architectural Design Specification

## Overview
The **Jenkins Plugin Modernizer Dashboard** is a static, domain-driven analytics platform that visualizes the modernization status, core compatibility, and health metrics of the Jenkins plugin ecosystem. It is designed to run statically without ongoing server infrastructure while providing high-performance client-side filtering, sorting, and analytical capabilities.

---

## Component Architecture

```
src/
├── domain/                    # Pure, framework-agnostic domain logic
│   ├── types.ts               # Core domain interfaces and status unions
│   ├── validation.ts          # Dataset schema validation and normalizers
│   ├── baselineParser.ts      # SemVer parser, patch comparison, and baseline drift
│   ├── checkClassification.ts # Centralized check-run aggregator (BOM, Parent, CI, CVE)
│   ├── scoring.ts             # Health scoring and actionable diagnostic checklists
│   ├── selectors.ts           # Filtering, cohort extraction, and workbench metrics
│   └── security.ts            # Shell allowlist, URL validator, and CSV sanitization
├── application/
│   └── remediation/
│       └── generateMasterScript.ts # Pure bash orchestration script generator
├── components/                # Modular, accessible UI presentation layer
│   ├── DashboardHeader.tsx    # Responsive header, system stats, and theme toggle
│   ├── DashboardTabs.tsx      # WAI-ARIA tablist with Arrow, Home, End keyboard nav
│   ├── WorkbenchPanel.tsx     # Surgical intervention console and priority queues
│   ├── MethodologyPanel.tsx   # Visual pipeline architecture and data dictionary
│   ├── SurgeryTray.tsx        # Floating queue terminal with non-nested controls
│   ├── DataExplorer.tsx       # Searchable, filterable, sortable table and exports
│   ├── BarChart.tsx           # Apache ECharts bar visualization with screen-reader tables
│   ├── PieChart.tsx           # Distribution pie charts with custom renderers
│   └── ErrorBoundary.tsx      # React error boundary for UI resilience
├── data/                      # Validated dataset and cryptographic manifest
│   ├── all_plugins.json       # Deterministically ordered plugin metadata
│   └── manifest.json          # Telemetry manifest bound to datasetSha256
└── Dashboard.tsx              # Main orchestrator uniting panels and filter state
```

---

## Multi-Panel Accessibility Architecture
To comply with WAI-ARIA authoring practices, all four primary tabpanels (`panel-overview`, `panel-workbench`, `panel-explorer`, `panel-methodology`) remain permanently mounted in the DOM.
- Inactive panels have `hidden={currentlyActiveTab !== targetTab}` and `display: none`.
- The tabs bar maintains roving `tabIndex={0 | -1}` and valid `aria-controls` targets at all times.
- State (scroll position, explorer pagination, search filters, and workbench cohorts) is preserved when toggling between tabs.

---

## Domain Logic & State Flow

1. **Ingestion & Cryptographic Verification**:
   - `scripts/fetchData.mjs` ingests upstream telemetry, cleans records, and computes `datasetSha256`.
   - `scripts/verifyData.mjs` independently asserts checksum match, schema validity, and plugin uniqueness.

2. **Validation & Normalization**:
   - `validatePluginDataset()` validates incoming records on application startup.
   - Baseline metadata (`jenkinsBaseline`, `effectiveBaseline`, `jenkinsVersion`, `targetBaseline`) is preserved through validation.

3. **Active Migration Selection**:
   - `selectActiveMigration()` selects the most recent migration by ISO timestamp, falling back to index 0 or `EMPTY_MIGRATION`.

4. **SemVer Jenkins Baseline Comparison**:
   - `parseJenkinsVersion()` parses `major.minor.patch`.
   - `compareJenkinsVersions()` accurately differentiates patch boundaries:
     - Minimum Supported: `2.440.3` (`2.440.2` is Critical, `2.440.3` is Warning).
     - Modern LTS: `2.580.2` (`2.580.1` is Warning, `2.580.2` is Aligned).

5. **Analytical Selection & Workbench Cohorts**:
   - `filterPlugins()` and `computeWorkbenchMetrics()` execute pure filtering rules across topic, PR status, risk severity, and strategic roadmaps.
