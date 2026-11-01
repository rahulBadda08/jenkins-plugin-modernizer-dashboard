import React from "react";
import architectureImage from "../assets/architecture_diagram.png";
import automationStackImage from "../assets/automation_stack_blueprint.png";
import dataAcquisitionImage from "../assets/data_acquisition_blueprint.png";
import visualizationLayerImage from "../assets/visualization_layer_blueprint.png";
import {
  LTS_BASELINE,
  MINIMUM_SUPPORTED_BASELINE,
  OUTDATED_MINOR_THRESHOLD,
} from "../domain/baselineParser";
import { SCORING_PENALTIES } from "../domain/scoring";

export interface MethodologyPanelProps {
  isVisible: boolean;
}

export const MethodologyPanel: React.FC<MethodologyPanelProps> = ({ isVisible }) => {
  const PHASES = [
    { range: [1, 1], label: "Data Acquisition", cls: "acquisition" },
    { range: [2, 3], label: "Processing Layer", cls: "processing" },
    { range: [4, 7], label: "Delivery Engine", cls: "delivery" },
    { range: [8, 10], label: "Operations", cls: "ops" },
  ];

  const archSteps = [
    {
      num: 1,
      title: "Data Acquisition",
      colorVar: "var(--accent-secondary)",
      imgSrc: dataAcquisitionImage,
      desc: "The application uses the `metadata-plugin-modernizer` repository via automated GitHub Actions as the primary data source. JSON and CSV files are fetched directly during the build process.",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
          <path d="M3.05 11a9 9 0 1 1 .5 4" />
          <polyline points="3 16 3 11 8 11" />
        </svg>
      ),
    },
    {
      num: 2,
      title: "Processing & Aggregation",
      colorVar: "var(--accent-amber)",
      desc: "A build-time layer parses schema datasets, extracts keys such as `migrationStatus`, and aggregates outcomes into optimized structural JSON outputs.",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
          <path d="M7 7h.01" />
        </svg>
      ),
    },
    {
      num: 3,
      title: "Data Validation",
      colorVar: "var(--accent-amber)",
      desc: "Schema validation applies default fallbacks and gracefully handles missing properties across datasets to ensure strict UI rendering stability.",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 12l2 2 4-4" />
          <path d="M9 7h6M9 17h6" />
        </svg>
      ),
    },
    {
      num: 4,
      title: "Static Site Generation",
      colorVar: "var(--accent-primary)",
      desc: "The frontend framework computes the JSON dataset artifacts into a scalable React & TypeScript build natively, eliminating continuous runtime APIs.",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      num: 5,
      title: "Visualization Layer",
      colorVar: "var(--accent-primary)",
      imgSrc: visualizationLayerImage,
      desc: "Metrics are painted across highly interactive Apache ECharts, visualizing priority rankings, continuous integrations breakdowns, and distribution vectors.",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
          <line x1="3" y1="20" x2="21" y2="20" />
        </svg>
      ),
    },
    {
      num: 6,
      title: "User Interaction & UX",
      colorVar: "var(--accent-primary)",
      desc: "Usability architecture driven entirely by responsive, executive interactive filtering interfaces sorting telemetry data live based on user input loops.",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" />
          <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
          <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
          <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
          <line x1="14.83" y1="9.17" x2="18.36" y2="5.64" />
          <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
        </svg>
      ),
    },
    {
      num: 7,
      title: "Plugin Reporting",
      colorVar: "var(--accent-primary)",
      desc: "Dedicated visualization matrix for isolated plugin entities parsing missing BOMs, automated PR deployment statuses, and direct repository networking.",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
    },
    {
      num: 8,
      title: "Automation Stack",
      colorVar: "var(--accent-neon)",
      imgSrc: automationStackImage,
      desc: "An automated Continuous Integration pipeline validates dataset fetching, schema computation, and redeploys automatically via webhook routines.",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
    {
      num: 9,
      title: "Deployment Target",
      colorVar: "var(--accent-neon)",
      desc: "Fully compiled environments map directly to GitHub Pages or `stats.jenkins.io` server architectures ensuring immense public request resilience.",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      num: 10,
      title: "Extensibility",
      colorVar: "var(--accent-neon)",
      desc: "Comprehensive documentation maps core visualization data structures so developers can graft native logic rules directly into broader Jenkins ecosystems.",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z" />
          <line x1="16" y1="8" x2="2" y2="22" />
          <line x1="17" y1="15" x2="9" y2="15" />
        </svg>
      ),
    },
  ];

  return (
    <div
      id="panel-methodology"
      role="tabpanel"
      aria-labelledby="tab-methodology"
      tabIndex={0}
      className="tab-content animate-fade-up"
      key="methodology"
      hidden={!isVisible}
      style={{ display: isVisible ? "block" : "none" }}
    >
      <div className="glass-card reveal-node" style={{ padding: "60px" }}>
        <p className="hero-label">SYSTEM_INTELLIGENCE_SPEC</p>
        <h2 className="title" style={{ marginBottom: "40px" }}>
          Architecture & <span className="text-accent">Methodology</span>
        </h2>

        {/* ── SECTION 1: ARCHITECTURE ── */}
        <div style={{ marginBottom: "80px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                width: "30px",
                height: "2px",
                background: "var(--accent-primary)",
              }}
            ></div>
            <h3
              className="mono"
              style={{
                fontSize: "18px",
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              01. Engineering Pipeline
            </h3>
          </div>
          <p className="arch-intro" style={{ textAlign: "left", maxWidth: "100%" }}>
            This project transforms Jenkins plugin modernization metadata into actionable visual
            insights using a build-time data processing approach.
          </p>
          <div className="arch-diagram" style={{ marginBottom: "60px" }}>
            <img
              src={architectureImage}
              alt="Static Data Pipeline Architecture"
              loading="lazy"
              decoding="async"
              style={{
                maxWidth: "100%",
                borderRadius: "24px",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          </div>

          <ol className="fb-timeline">
            {archSteps.map((item) => {
              const phaseStart = PHASES.find((p) => p.range[0] === item.num);
              return (
                <React.Fragment key={item.num}>
                  {phaseStart && (
                    <div className="fb-phase-divider">
                      <span className={`fb-phase-label ${phaseStart.cls}`}>{phaseStart.label}</span>
                    </div>
                  )}
                  <li
                    className="fb-timeline-item"
                    style={{ "--node-color": item.colorVar } as React.CSSProperties}
                  >
                    <span className="fb-node" title={item.title}>
                      <span className="fb-node-icon" style={{ color: "currentColor" }}>
                        {item.icon}
                      </span>
                    </span>
                    <div className="fb-card">
                      <span className="fb-phase-badge">
                        [STEP_{item.num < 10 ? `0${item.num}` : item.num}]
                      </span>
                      <h3 className="fb-item-title">{item.title}</h3>
                      {item.imgSrc && (
                        <div className="fb-blueprint">
                          <img
                            src={item.imgSrc}
                            alt={`${item.title} Blueprint`}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      )}
                      <p className="fb-item-body">
                        {item.desc.split(/`([^`]+)`/g).map((part, idx) =>
                          idx % 2 === 1 ? <code key={idx}>{part}</code> : part
                        )}
                      </p>
                    </div>
                  </li>
                </React.Fragment>
              );
            })}
          </ol>
        </div>

        <div
          style={{
            width: "100%",
            height: "1px",
            background: "rgba(255,255,255,0.1)",
            margin: "80px 0",
          }}
        ></div>

        {/* ── SECTION 2: DATA DICTIONARY ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "30px",
              height: "2px",
              background: "var(--accent-amber)",
            }}
          ></div>
          <h3
            className="mono"
            style={{
              fontSize: "18px",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            02. Telemetry Methodology
          </h3>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "40px",
            textAlign: "left",
          }}
        >
          <div className="method-module">
            <h3
              className="mono"
              style={{
                color: "var(--accent-secondary)",
                fontSize: "18px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: "12px",
              }}
            >
              LTS Baseline Logic
            </h3>
            <p style={{ opacity: 0.8, lineHeight: "1.6" }}>
              The system anchors every metric against the current **Jenkins LTS Baseline** (
              <code className="mono">{LTS_BASELINE}</code>) and runtime minimum (
              <code className="mono">{MINIMUM_SUPPORTED_BASELINE}</code>). Any plugin falling below
              the minimum threshold is flagged for **Critical Legacy Drift**.
            </p>
          </div>

          <div className="method-module">
            <h3
              className="mono"
              style={{
                color: "var(--accent-amber)",
                fontSize: "18px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: "12px",
              }}
            >
              Criticality Matrix
            </h3>
            <div style={{ opacity: 0.8, lineHeight: "1.6" }}>
              The Drift Gap is calculated by minor version distance from LTS:
              <ul style={{ marginTop: "12px", listStyle: "none", padding: 0 }}>
                <li>🔴 <strong>Critical</strong>: Gap &gt; 50 releases.</li>
                <li>🟠 <strong>Moderate</strong>: Gap &gt; 20 releases.</li>
                <li>🔵 <strong>Optimized</strong>: Within 20 releases.</li>
              </ul>
            </div>
          </div>

          <div className="method-module">
            <h3
              className="mono"
              style={{
                color: "var(--accent-green)",
                fontSize: "18px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: "12px",
              }}
            >
              Health Index Calculation
            </h3>
            <div style={{ opacity: 0.8, lineHeight: "1.6" }}>
              Plugins start at <strong>100</strong> (bounded to 5–100). Deductions are applied for confirmed issues:
              <ul style={{ marginTop: "12px", listStyle: "none", padding: 0, fontSize: "13px" }}>
                <li style={{ marginBottom: "4px" }}>
                  📉 <strong>-{SCORING_PENALTIES.MIGRATION_FAILURE}</strong>: Migration execution failure.
                </li>
                <li style={{ marginBottom: "4px" }}>
                  🛑 <strong>-{SCORING_PENALTIES.CI_EXPLICIT_FAILURE}</strong>: Automated CI validation failure.
                </li>
                <li style={{ marginBottom: "4px" }}>
                  ⚠️ <strong>-{SCORING_PENALTIES.DEPRECATED_TAG}</strong>: Flagged with deprecated tag.
                </li>
                <li style={{ marginBottom: "4px" }}>
                  🧬 <strong>-{SCORING_PENALTIES.BOM_EXPLICIT_FAILURE}</strong>: BOM alignment failure.
                </li>
                <li style={{ marginBottom: "4px" }}>
                  🏛️ <strong>-{SCORING_PENALTIES.BASELINE_OUTDATED}</strong>: Legacy core baseline (&lt; {OUTDATED_MINOR_THRESHOLD}).
                </li>
                <li style={{ marginBottom: "4px" }}>
                  📬 <strong>-{SCORING_PENALTIES.PR_CLOSED_UNMERGED}</strong>: PR closed without merge.
                </li>
              </ul>
            </div>
          </div>

          <div className="method-module">
            <h3
              className="mono"
              style={{
                color: "var(--accent-neon)",
                fontSize: "18px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: "12px",
              }}
            >
              Data Integrity
            </h3>
            <p style={{ opacity: 0.8, lineHeight: "1.6" }}>
              Every statistic is derived from <code>aggregated_migrations.json</code>. This dashboard
              acts as a visual interpretation layer for existing telemetry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MethodologyPanel;
