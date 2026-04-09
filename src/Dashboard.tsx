import "./Dashboard.css";
import BarChart from "./components/BarChart";
import PieChart from "./components/PieChart";
import DataExplorer from "./components/DataExplorer";
import allPluginsRaw from "./data/all_plugins.json";
import { useState } from "react";

// ── STRICT TYPESCRIPT DEFINITIONS ──
// These definitions mirror the exact Jenkins metadata-plugin-modernizer JSON schema payload.
// Definitively typing these ensures the dashboard never drops data or crashes silently on bad nodes.
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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CORE APPLICATION ROUTER (Dashboard)
 * Serves as the master engine of the application, managing global plugin data,
 * state navigation, and orchestrating the rendering lifecycle for the data-viz elements.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function Dashboard() {
  // We typecast the statically imported, automatically ingested JSON bundle safely into React Memory
  const allPluginsData = allPluginsRaw as unknown as PluginData[];
  
  // High-level navigation state router. Defaults to painting the macro global perspective.
  const [currentlyActiveTab, setCurrentlyActiveTab] = useState<string>("Global Overview");

  // Ecosystem sanitization: We forcefully drop empty plugin repositories that carry zero diagnostic tests.
  const pluginsWithValidMigrationData = allPluginsData.filter(plugin => plugin.migrations && plugin.migrations.length > 0);

  // ── PRECOMPUTED GLOBAL METRICS ──
  // These mapping and reduction pipelines run specifically for the "Global Overview" Ecosystem summary calculations.
  const allCodeAdditions = pluginsWithValidMigrationData.map(plugin => plugin.migrations[0].additions || 0);
  const allCodeDeletions = pluginsWithValidMigrationData.map(plugin => plugin.migrations[0].deletions || 0);

  // reduce() rapidly condenses the arrays of 400+ numbers into flat mathematical totals.
  const grandTotalAdditions = allCodeAdditions.reduce((runningTotal, currentNumber) => runningTotal + currentNumber, 0);
  const grandTotalDeletions = allCodeDeletions.reduce((runningTotal, currentNumber) => runningTotal + currentNumber, 0);
  const grandTotalFilesChanged = pluginsWithValidMigrationData.reduce((runningTotal, plugin) => runningTotal + (plugin.migrations[0].changedFiles || 0), 0);

  // ── GSOC: TOPIC TAG AGGREGATION ──
  // Mathematically reduces the entire plugin matrix to count exactly which OpenRewrite tags were used (e.g., Parent POM, JS-305)
  const globalTagCounts: Record<string, number> = {};
  pluginsWithValidMigrationData.forEach(plugin => {
    const tags = plugin.migrations[0].tags || [];
    tags.forEach(tag => {
      globalTagCounts[tag] = (globalTagCounts[tag] || 0) + 1;
    });
  });

  // Convert raw counts into ECharts Pie formatting and take top 6 for clean visual distribution
  const rawPieData = Object.keys(globalTagCounts)
    .map(tag => ({ name: tag, value: globalTagCounts[tag] }))
    .sort((a,b) => b.value - a.value);
  const topPieData = rawPieData.slice(0, 6);
  const otherPieCount = rawPieData.slice(6).reduce((acc, curr) => acc + curr.value, 0);
  if (otherPieCount > 0) topPieData.push({ name: "Other Topics", value: otherPieCount });

  // Dynamic Lookup Pointer for when the user clicks explicitly onto an isolated Plugin Tab.
  const currentlySelectedPlugin = allPluginsData.find((plugin) => plugin.pluginName === currentlyActiveTab);

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Plugin Modernizer Stats Visualization</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "-10px", fontSize: "16px" }}>Jenkins Ecosystem Dashboard</p>
      </div>

      {/* ── TOP NAVIGATION NAVBAR ── */}
      <div className="tabs-container" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={() => setCurrentlyActiveTab("Global Overview")}
          className={`tab-btn ${currentlyActiveTab === "Global Overview" ? "active" : ""}`}
        >
          Overview
        </button>
        <button
          onClick={() => setCurrentlyActiveTab("Topic Dashboards")}
          className={`tab-btn ${currentlyActiveTab === "Topic Dashboards" ? "active" : ""}`}
        >
          Modernization Topics
        </button>
        <button
          onClick={() => setCurrentlyActiveTab("Data Explorer")}
          className={`tab-btn ${currentlyActiveTab === "Data Explorer" ? "active" : ""}`}
        >
          Data Explorer
        </button>
        <button
          onClick={() => setCurrentlyActiveTab("Methodology")}
          className={`tab-btn ${currentlyActiveTab === "Methodology" ? "active" : ""}`}
        >
          Methodology
        </button>
      </div>

      {currentlyActiveTab === "Global Overview" ? (
        <div className="tab-content animate-fade-up" key="global">
          <h2 className="title" style={{ textAlign: "center", marginBottom: "30px" }}>
            Ecosystem Impact (<span className="plugin-name">{pluginsWithValidMigrationData.length} Plugins Processed</span>)
          </h2>

          <div className="glass-card summary-card delay-1">
            <div className="summary-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", textAlign: "center" }}>
              <div className="summary-item">
                <span className="summary-label">Total Code Additions</span>
                <span className="summary-value" style={{ color: "#10B981", fontSize: "32px", fontWeight: 800 }}>+{grandTotalAdditions}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Code Deletions</span>
                <span className="summary-value" style={{ color: "#EF4444", fontSize: "32px", fontWeight: 800 }}>-{grandTotalDeletions}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Files Affected</span>
                <span className="summary-value" style={{ color: "#3B82F6", fontSize: "32px", fontWeight: 800 }}>{grandTotalFilesChanged}</span>
              </div>
            </div>
          </div>

          {/* ── MACRO BAR CHART ECHARTS INJECTION ── */}
          <div className="charts-grid delay-2">
            <div className="glass-card chart-card chart-full">
              {(() => {
                // Return all valid plugins exactly as imported, but explicitly sort them numerically descending.
                // This sorting transforms noisy horizontal scatter-plots into a beautiful, scannable "Pareto Curve" visual.
                const allPluginsScaled = [...pluginsWithValidMigrationData]
                  .map(plugin => ({
                    name: plugin.pluginName,
                    totalMods: (plugin.migrations[0].additions || 0) + (plugin.migrations[0].deletions || 0)
                  }))
                  .sort((a, b) => b.totalMods - a.totalMods);

                return (
                  <BarChart
                    labels={allPluginsScaled.map(p => p.name)}
                    data={allPluginsScaled.map(p => p.totalMods)}
                    colors={allPluginsScaled.map(() => "#8b5cf6")}
                    title="Overall Code Modifications per Plugin"
                    rotateLabel={30}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      ) : currentlyActiveTab === "Topic Dashboards" ? (
        <div className="tab-content animate-fade-up" key="topics">
          <div className="glass-card chart-card chart-full" style={{ outline: '1px solid rgba(167, 139, 250, 0.4)' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <h3 style={{ color: '#F3F4F6', fontSize: '18px', margin: 0 }}>Ecosystem Modernization Topic Vectors</h3>
              <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '5px' }}>Distribution of OpenRewrite tags mapping the specific focus of plugin modernizations (e.g. Parent POM, BOM, JSR-305).</p>
            </div>
            {topPieData.length > 0 ? (
              <PieChart data={topPieData} title="Plugin Topic Aggregation" />
            ) : (
              <div style={{ color: "#9CA3AF", textAlign: "center", padding: "40px" }}>No topic tags found in dataset.</div>
            )}
          </div>
        </div>
      ) : currentlyActiveTab === "Methodology" ? (
        <div className="tab-content animate-fade-up" key="methodology">
           <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', lineHeight: '1.6' }}>
             <h2 style={{ color: '#A78BFA', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Methodology & Data Dictionary</h2>
             
             <h3 style={{ color: '#F3F4F6' }}>Source of Truth</h3>
             <p style={{ color: '#9CA3AF' }}>All telemetry displayed on this static dashboard is securely ingested at build-time directly from the official <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: '4px' }}>jenkins-infra/metadata-plugin-modernizer</code> repository via automated GitHub Actions.</p>
             
             <h3 style={{ color: '#F3F4F6' }}>Data Publishing & Freshness</h3>
             <p style={{ color: '#9CA3AF' }}>This project employs an autonomous CI/CD YAML pipeline. Every night at 00:00 UTC, the system verifies Jenkins data logic, parses raw JSON artifacts, and publishes standard schema configurations directly to the public Github Pages URL.</p>

             <h3 style={{ color: '#F3F4F6' }}>Data Dictionary</h3>
             <ul style={{ color: '#9CA3AF' }}>
               <li style={{ marginBottom: '10px' }}><strong style={{ color: '#F3F4F6' }}>Migration Status:</strong> The final output status of the Jenkins CLI executing the OpenRewrite transformation on a native repository (e.g., SUCCESS if code safely compiled, FAILURE if the transform encountered syntax collisions).</li>
               <li style={{ marginBottom: '10px' }}><strong style={{ color: '#F3F4F6' }}>Pull Request Status:</strong> Reflects the current state of the automatically generated Pull Request pushing the modernized code back to the original Jenkins plugin maintainers for review.</li>
               <li style={{ marginBottom: '10px' }}><strong style={{ color: '#F3F4F6' }}>Topics (Tags):</strong> Specific Jenkins-core metadata topics that were targeted within the transformation (e.g. updating the BOM, standardizing deprecated Java 11 API bounds).</li>
             </ul>
           </div>
        </div>
      ) : currentlyActiveTab === "Data Explorer" ? (
        <div className="tab-content animate-fade-up" key="explorer">
          <DataExplorer plugins={allPluginsData} onPluginSelect={setCurrentlyActiveTab} />
        </div>
      ) : currentlySelectedPlugin && currentlySelectedPlugin.migrations.length > 0 ? (
        <div className="tab-content" key={currentlyActiveTab}>
          {(() => {
            const migrationData = currentlySelectedPlugin.migrations[0];

            // ── Bar Chart 1: CI Check Runs ─────────────────────────────
            const healthTestNames = Object.keys(migrationData.checkRuns || {});
            const healthTestResults = healthTestNames.map((testName) => (migrationData.checkRuns[testName] === "success" ? 1 : 0));
            const healthTestColors = healthTestResults.map((result) => (result === 1 ? "#10B981" : "#EF4444"));

            // ── Bar Chart 2: Code Changes ──────────────────────────────
            const codeChangeCategories = ["Additions", "Deletions", "Changed Files"];
            const codeChangeStats = [migrationData.additions, migrationData.deletions, migrationData.changedFiles];
            const codeChangeColors = ["#10B981", "#EF4444", "#3B82F6"];

            // ── Pie Chart 1: Check Runs Summary ───────────────────────
            const successfulTestsCount = healthTestResults.filter((result) => result === 1).length;
            const failedTestsCount = healthTestResults.length - successfulTestsCount;
            const healthTestSummaryChartData = [
              { name: "Success", value: successfulTestsCount },
              { name: "Null / Pending", value: failedTestsCount },
            ];

            // ── Pie Chart 2: Migration & PR Status ────────────────────
            const migrationStatusChartData = [
              { name: `Migration: ${migrationData.migrationStatus || "unknown"}`, value: 1 },
              { name: `PR: ${migrationData.pullRequestStatus || "unknown"}`, value: 1 },
            ];

            return (
              <>
                {/* ── Page Header Toolbar ── */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", marginTop: "10px" }}>
                  <button 
                    onClick={() => setCurrentlyActiveTab("Data Explorer")}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-secondary)", cursor: "pointer", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold" }}
                  >
                    ← Back
                  </button>
                  
                  <h2 className="title animate-fade-up" style={{ margin: 0 }}>
                    <span className="plugin-name">{currentlySelectedPlugin.pluginName}</span>
                  </h2>
                  
                  <a
                    href={currentlySelectedPlugin.pluginRepository}
                    target="_blank"
                    rel="noreferrer"
                    className="repo-link animate-fade-up"
                    style={{ display: "inline-block", padding: "8px 20px" }}
                  >
                    <span style={{ fontSize: "18px" }}>📦</span> View Repository
                  </a>
                </div>

                {/* ── Summary Card ── */}
                <div className="glass-card summary-card animate-fade-up delay-1">
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Recipe</span>
                      <span className="summary-value">{migrationData.migrationName}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Migration Status</span>
                      <span className={`badge badge-${(migrationData.migrationStatus || "unknown").toLowerCase()}`}>
                        {migrationData.migrationStatus || "unknown"}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">PR Status</span>
                      <span className={`badge badge-${(migrationData.pullRequestStatus || "unknown").toLowerCase()}`}>
                        {(migrationData.pullRequestStatus || "unknown").replace("_", " ")}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Check Runs</span>
                      <span className="badge badge-pending">{migrationData.checkRunsSummary}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Plugin Version</span>
                      <span className="summary-value">{migrationData.pluginVersion || "N/A"}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Jenkins Version</span>
                      <span className="summary-value">{migrationData.jenkinsVersion || "N/A"}</span>
                    </div>
                    <div className="summary-item" style={{ gridColumn: "1 / -1" }}>
                      <span className="summary-label">Tags</span>
                      <div className="tags">
                        {(migrationData.tags || []).map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Pull Request</span>
                      <a href={migrationData.pullRequestUrl} target="_blank" rel="noreferrer" className="pr-link">
                        {migrationData.pullRequestUrl}
                      </a>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Timestamp</span>
                      <span className="summary-value">{migrationData.timestamp}</span>
                    </div>
                  </div>
                </div>

                {/* ── GSOC: Recommended Action Steps ── */}
                <div className="glass-card animate-fade-up delay-1" style={{ margin: '20px 0', borderLeft: migrationData.migrationStatus === 'SUCCESS' ? '4px solid #34D399' : '4px solid #FBBF24' }}>
                  <h3 style={{ color: '#F3F4F6', marginTop: 0 }}>Recommended Action Steps</h3>
                  <p style={{ color: '#9CA3AF', lineHeight: '1.6' }}>
                    {migrationData.migrationStatus === 'SUCCESS' 
                      ? " The OpenRewrite transformation succeeded. Analysts should manually inspect the Pull Request diff link above. Maintainers must verify backward compatibility before approving the PR merge." 
                      : " Transformation Failed. The automated script collided with custom logic. Maintainers are recommended to manually evaluate the native 'pom.xml' for conflicting dependency bounds and test configurations."}
                  </p>
                </div>

                {/* ── Charts Grid ── */}
                <div className="charts-grid">
                  <div className="glass-card chart-card animate-fade-up delay-2">
                    <PieChart
                      data={healthTestSummaryChartData}
                      title="Check Runs Summary"
                      colors={["#10B981", "#EF4444"]}
                    />
                  </div>

                  <div className="glass-card chart-card animate-fade-up delay-2">
                    <BarChart
                      labels={codeChangeCategories}
                      data={codeChangeStats}
                      colors={codeChangeColors}
                      title="Code Changes"
                    />
                  </div>

                  <div className="glass-card chart-card chart-full animate-fade-up delay-3">
                    <BarChart
                      labels={healthTestNames}
                      data={healthTestResults.map((result) => (result === 1 ? 1 : 0.3))}
                      colors={healthTestColors}
                      title="CI Check Runs (Green = Pass, Red = Null/Fail)"
                      rotateLabel={40}
                      yMax={1}
                      yFormatter={(v: number) => (v >= 1 ? "Pass" : "Fail")}
                    />
                  </div>

                  <div className="glass-card chart-card animate-fade-up delay-4">
                    <PieChart
                      data={migrationStatusChartData}
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
          <h2>No migration statistics are available for '{currentlyActiveTab}' at this time.</h2>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
