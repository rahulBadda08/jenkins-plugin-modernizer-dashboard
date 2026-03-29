import "./Dashboard.css";
import BarChart from "./components/BarChart";
import PieChart from "./components/PieChart";
import { useEffect, useState } from "react";

const PLUGIN_NAMES = [
  "tekton-client",
  "pipeline-utility-steps",
  "requests",
  "custom-build-properties",
  "git",
  "Office-365-Connector"
];

const getUrl = (name: string) =>
  `https://raw.githubusercontent.com/jenkins-infra/metadata-plugin-modernizer/refs/heads/main/${name}/reports/aggregated_migrations.json`;

// Stricter TypeScript definitions
type MigrationStatus = "SUCCESS" | "FAILURE" | "PENDING" | "RUNNING" | "ABORTED" | string;
type PRStatus = "MERGED" | "OPEN" | "CLOSED" | "DRAFT" | string;

interface Migration {
  migrationName: string;
  migrationStatus: MigrationStatus;
  pullRequestStatus: PRStatus;
  pullRequestUrl: string;
  tags: string[];
  checkRuns: Record<string, string | null>;
  checkRunsSummary: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  pluginVersion: string;
  jenkinsVersion: string;
  timestamp: string;
}

interface PluginData {
  pluginName: string;
  pluginRepository: string;
  migrations: Migration[];
}

function Dashboard() {
  const [plugins, setPlugins] = useState<PluginData[]>([]);
  const [activeTab, setActiveTab] = useState<string>("Global Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(
      PLUGIN_NAMES.map((name) =>
        fetch(getUrl(name)).then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch ${name}`);
          return res.json();
        })
      )
    )
      .then((data: PluginData[]) => {
        setPlugins(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="container">
        <p className="loading">Loading plugin data...</p>
      </div>
    );
  if (error)
    return (
      <div className="container">
        <p className="error">Error: {error}</p>
      </div>
    );
  if (plugins.length === 0) return null;

  const validPlugins = plugins.filter(p => p.migrations && p.migrations.length > 0);

  // Global Context logic
  const globalAdditions = validPlugins.map(p => p.migrations[0].additions || 0);
  const globalDeletions = validPlugins.map(p => p.migrations[0].deletions || 0);
  const globalPluginNames = validPlugins.map(p => p.pluginName);

  const totalAdditions = globalAdditions.reduce((acc, val) => acc + val, 0);
  const totalDeletions = globalDeletions.reduce((acc, val) => acc + val, 0);
  const totalChangedFiles = validPlugins.reduce((acc, p) => acc + (p.migrations[0].changedFiles || 0), 0);

  // Safely find individual plugin data
  const activePluginData = plugins.find((p) => p.pluginName === activeTab);

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Plugin Modernizer Stats Visualization</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "-10px", fontSize: "16px" }}>Jenkins Ecosystem Dashboard</p>
      </div>

      <div className="tabs-container">
        <button
          onClick={() => setActiveTab("Global Overview")}
          className={`tab-btn ${activeTab === "Global Overview" ? "active" : ""}`}
        >
          Global Overview
        </button>
        {PLUGIN_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => setActiveTab(name)}
            className={`tab-btn ${activeTab === name ? "active" : ""}`}
            title={`View ${name} migration analytics`}
          >
            {name}
          </button>
        ))}
      </div>

      {activeTab === "Global Overview" ? (
        <div className="tab-content animate-fade-up" key="global">
          <h2 className="title" style={{ textAlign: "center", marginBottom: "30px" }}>
            Aggregate Impact (<span className="plugin-name">{validPlugins.length} Plugins</span>)
          </h2>

          <div className="glass-card summary-card delay-1">
            <div className="summary-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", textAlign: "center" }}>
              <div className="summary-item">
                <span className="summary-label">Total Additions</span>
                <span className="summary-value" style={{ color: "#10B981", fontSize: "32px", fontWeight: 800 }}>+{totalAdditions}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Deletions</span>
                <span className="summary-value" style={{ color: "#EF4444", fontSize: "32px", fontWeight: 800 }}>-{totalDeletions}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Files Affected</span>
                <span className="summary-value" style={{ color: "#3B82F6", fontSize: "32px", fontWeight: 800 }}>{totalChangedFiles}</span>
              </div>
            </div>
          </div>

          <div className="charts-grid delay-2">
            <div className="glass-card chart-card chart-full">
              <BarChart
                labels={globalPluginNames}
                data={validPlugins.map(p => (p.migrations[0].additions || 0) + (p.migrations[0].deletions || 0))}
                colors={validPlugins.map(() => "#8b5cf6")}
                title="Total Lines Changed per Plugin (Additions + Deletions)"
                rotateLabel={30}
              />
            </div>
          </div>
        </div>
      ) : activePluginData && activePluginData.migrations.length > 0 ? (
        <div className="tab-content" key={activeTab}>
          {(() => {
            const m = activePluginData.migrations[0];

            // ── Bar Chart 1: CI Check Runs ─────────────────────────────
            const checkNames = Object.keys(m.checkRuns || {});
            const checkValues = checkNames.map((k) => (m.checkRuns[k] === "success" ? 1 : 0));
            const checkColors = checkValues.map((v) => (v === 1 ? "#10B981" : "#EF4444"));

            // ── Bar Chart 2: Code Changes ──────────────────────────────
            const codeLabels = ["Additions", "Deletions", "Changed Files"];
            const codeValues = [m.additions, m.deletions, m.changedFiles];
            const codeColors = ["#10B981", "#EF4444", "#3B82F6"];

            // ── Pie Chart 1: Check Runs Summary ───────────────────────
            const passCount = checkValues.filter((v) => v === 1).length;
            const failCount = checkValues.length - passCount;
            const checkPieData = [
              { name: "Success", value: passCount },
              { name: "Null / Pending", value: failCount },
            ];

            // ── Pie Chart 2: Migration & PR Status ────────────────────
            const statusPieData = [
              { name: `Migration: ${m.migrationStatus || "unknown"}`, value: 1 },
              { name: `PR: ${m.pullRequestStatus || "unknown"}`, value: 1 },
            ];

            return (
              <>
                <div style={{ textAlign: "center" }}>
                  <h2 className="title animate-fade-up">
                    <span className="plugin-name">{activePluginData.pluginName}</span>
                  </h2>
                  <a
                    href={activePluginData.pluginRepository}
                    target="_blank"
                    rel="noreferrer"
                    className="repo-link animate-fade-up"
                  >
                    <span style={{ fontSize: "18px" }}>📦</span> View Repository
                  </a>
                </div>

                {/* ── Summary Card ── */}
                <div className="glass-card summary-card animate-fade-up delay-1">
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Recipe</span>
                      <span className="summary-value">{m.migrationName}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Migration Status</span>
                      <span className={`badge badge-${(m.migrationStatus || "unknown").toLowerCase()}`}>
                        {m.migrationStatus || "unknown"}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">PR Status</span>
                      <span className={`badge badge-${(m.pullRequestStatus || "unknown").toLowerCase()}`}>
                        {(m.pullRequestStatus || "unknown").replace("_", " ")}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Check Runs</span>
                      <span className="badge badge-pending">{m.checkRunsSummary}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Plugin Version</span>
                      <span className="summary-value">{m.pluginVersion || "N/A"}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Jenkins Version</span>
                      <span className="summary-value">{m.jenkinsVersion || "N/A"}</span>
                    </div>
                    <div className="summary-item" style={{ gridColumn: "1 / -1" }}>
                      <span className="summary-label">Tags</span>
                      <div className="tags">
                        {(m.tags || []).map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Pull Request</span>
                      <a href={m.pullRequestUrl} target="_blank" rel="noreferrer" className="pr-link">
                        {m.pullRequestUrl}
                      </a>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Timestamp</span>
                      <span className="summary-value">{m.timestamp}</span>
                    </div>
                  </div>
                </div>

                {/* ── Charts Grid ── */}
                <div className="charts-grid">
                  <div className="glass-card chart-card animate-fade-up delay-2">
                    <PieChart
                      data={checkPieData}
                      title="Check Runs Summary"
                      colors={["#10B981", "#EF4444"]}
                      donut
                    />
                  </div>

                  <div className="glass-card chart-card animate-fade-up delay-2">
                    <BarChart
                      labels={codeLabels}
                      data={codeValues}
                      colors={codeColors}
                      title="Code Changes"
                    />
                  </div>

                  <div className="glass-card chart-card chart-full animate-fade-up delay-3">
                    <BarChart
                      labels={checkNames}
                      data={checkValues.map((v) => (v === 1 ? 1 : 0.3))}
                      colors={checkColors}
                      title="CI Check Runs (Green = Pass, Red = Null/Fail)"
                      rotateLabel={40}
                      yMax={1}
                      yFormatter={(v: number) => (v >= 1 ? "Pass" : "Fail")}
                    />
                  </div>

                  <div className="glass-card chart-card animate-fade-up delay-4">
                    <PieChart
                      data={statusPieData}
                      title="Migration & PR Status"
                      colors={["#10B981", "#8b5cf6"]}
                    />
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        <div className="glass-card animate-fade-up" style={{ textAlign: "center", padding: "60px" }}>
          <h2>No valid migration data found for {activeTab}.</h2>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
