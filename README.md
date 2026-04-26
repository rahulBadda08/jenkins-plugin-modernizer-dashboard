# Jenkins Plugin Modernizer Dashboard

[![Sync Data & Deploy](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/sync-plugin-data.yml/badge.svg)](https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard/actions/workflows/sync-plugin-data.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-fidelity, public analytics dashboard for visualizing the health and modernization status of the Jenkins plugin ecosystem. This project consumes the dataset produced by the [Jenkins Plugin Modernizer Tool](https://github.com/jenkins-infra/plugin-modernizer-tool) and presents it as an actionable insight for the Jenkins maintainer.

## 🚀 Live Dashboard
**[View the Jenkins Plugin Modernizer Dashboard](https://rahulBadda08.github.io/jenkins-plugin-modernizer-dashboard/)**

---

## 🎯 Project Goal (GSoC 2026)
This project is built according to the [Jenkins GSoC 2026 "Plugin Modernizer Stats Visualization" Roadmap](https://www.jenkins.io/projects/gsoc/2026/project-ideas/plugin-modernizer-stats-visualization/):
- **Build-Time Ingestion**: Pulls raw metadata from `jenkins-infra/metadata-plugin-modernizer` during the build process to ensure a fast, static experience.
- **Actionable Visualization**: Provides ecosystem-wide health metrics and deep-dives into an individual plugin (Parent POM, BOM, Test Framework).
- **Client-Side Intelligence**: Advanced filtering and search capability without a dynamic backend.
- **Automated Operation**: Fully automated CI/CD pipeline for a daily data update and deployment.


## 🏗️ Architecture
The dashboard follows a "Static Intelligence" pattern:
1. **Fetch**: A Node.js script (`scripts/fetchData.mjs`) discovers and downloads hundreds of plugin reports from the Jenkins infra metadata repository.
2. **Compile**: Data is aggregated and validated into a single optimized JSON bundle in `src/data/all_plugins.json`.
3. **Bundle**: Vite.js bundles this data directly into the application during the production build.
4. **Render**: A React + TypeScript frontend uses **Apache ECharts** for high-performance telemetry visualization.

## 🛠️ Tech Stack
- **Framework**: React 19 + Vite 8
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Custom Design System) + Tailwind CSS (Layout Utilities)
- **Visuals**: Apache ECharts
- **Automation**: GitHub Actions

---

## 🤝 Contribution Guide
We welcome contributions from the Jenkins community!

### Adding a New Visualization
1. Check the data structure in `src/data/all_plugins.json`.
2. Create a new component in `src/components/`.
3. Use Apache ECharts to render your metric.
4. Integrate the component into the `Dashboard.tsx` layout.

### Modifying Modernization Rules
If you want to change how "Priority" or "Risk" is calculated:
1. Locate the `getPluginInsight` function in `src/Dashboard.tsx`.
2. Update the logic for `checklist`, `priorities`, or `surgical` commands.

---

## 💻 Local Development

### Prerequisites
- Node.js (v24 or higher recommended)
- npm

### Setup
```bash
# Clone the repository
git clone https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard.git
cd jenkins-plugin-modernizer-dashboard

# Install dependencies
npm install

# Fetch latest Jenkins ecosystem data
npm run predev

# Start development server
npm run dev
```

### Building for Production
```bash
npm run build
```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Part of the Jenkins GSoC 2026 Initiative.*
