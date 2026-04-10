import "./Dashboard.css";
import BarChart from "./components/BarChart";
import PieChart from "./components/PieChart";
import DataExplorer from "./components/DataExplorer";
import allPluginsRaw from "./data/all_plugins.json";
import { useState, useMemo, useEffect } from "react";

// ── STRICT TYPESCRIPT DEFINITIONS ──
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
  const allPluginsData = allPluginsRaw as unknown as PluginData[];
  const [currentlyActiveTab, setCurrentlyActiveTab] = useState<string>("Global Overview");

  // ── ROUTING & HISTORY SYNCHRONIZATION ──
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/", "").toLowerCase();
      if (!hash || hash === "") {
        setCurrentlyActiveTab("Global Overview");
        return;
      }

      // Map Hash to Tab State
      const tabMap: Record<string, string> = {
        "overview": "Global Overview",
        "topics": "Topic Dashboards",
        "explorer": "Data Explorer",
        "methodology": "Methodology"
      };

      if (tabMap[hash]) {
        setCurrentlyActiveTab(tabMap[hash]);
      } else if (hash.startsWith("plugin/")) {
        // Handle Plugin Detail Deep Links
        const pluginName = decodeURIComponent(hash.replace("plugin/", ""));
        const exists = allPluginsData.some(p => p.pluginName === pluginName);
        if (exists) setCurrentlyActiveTab(pluginName);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // Sync on mount
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [allPluginsData]);

  // Update hash when tab state changes
  useEffect(() => {
    const tabToHash: Record<string, string> = {
      "Global Overview": "overview",
      "Topic Dashboards": "topics",
      "Data Explorer": "explorer",
      "Methodology": "methodology"
    };

    const targetHash = tabToHash[currentlyActiveTab] 
      ? `/${tabToHash[currentlyActiveTab]}`
      : `/plugin/${encodeURIComponent(currentlyActiveTab)}`;

    if (window.location.hash !== `#${targetHash}`) {
      window.history.pushState(null, "", `#${targetHash}`);
    }
  }, [currentlyActiveTab]);

  const pluginsWithValidMigrationData = useMemo(() => 
    allPluginsData.filter(plugin => plugin.migrations && plugin.migrations.length > 0),
    [allPluginsData]
  );

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const grandTotalAdditions = useMemo(() => 
    pluginsWithValidMigrationData.reduce((acc, plugin) => acc + (plugin.migrations[0].additions || 0), 0)
  , [pluginsWithValidMigrationData]);

  const grandTotalDeletions = useMemo(() => 
    pluginsWithValidMigrationData.reduce((acc, plugin) => acc + (plugin.migrations[0].deletions || 0), 0)
  , [pluginsWithValidMigrationData]);

  const grandTotalFilesChanged = useMemo(() => 
    pluginsWithValidMigrationData.reduce((acc, plugin) => acc + (plugin.migrations[0].changedFiles || 0), 0)
  , [pluginsWithValidMigrationData]);

  const { topPieData, overviewLabels, overviewData } = useMemo(() => {
    const globalTagCounts: Record<string, number> = {};
    pluginsWithValidMigrationData.forEach(plugin => {
      (plugin.migrations[0].tags || []).forEach(tag => {
        globalTagCounts[tag] = (globalTagCounts[tag] || 0) + 1;
      });
    });

    const rawPieData = Object.keys(globalTagCounts)
      .map(tag => ({ name: tag, value: globalTagCounts[tag] }))
      .sort((a,b) => b.value - a.value);
    
    const top6 = rawPieData.slice(0, 6);
    const otherPieCount = rawPieData.slice(6).reduce((acc, curr) => acc + curr.value, 0);
    if (otherPieCount > 0) top6.push({ name: "Other Topics", value: otherPieCount });

    const scaled = [...pluginsWithValidMigrationData]
      .map(plugin => ({
        name: plugin.pluginName,
        totalMods: (plugin.migrations[0].additions || 0) + (plugin.migrations[0].deletions || 0)
      }))
      .sort((a, b) => b.totalMods - a.totalMods);

    return { 
      topPieData: top6, 
      overviewLabels: scaled.map(p => p.name), 
      overviewData: scaled.map(p => p.totalMods) 
    };
  }, [pluginsWithValidMigrationData]);

  const currentlySelectedPlugin = useMemo(() => 
    allPluginsData.find((plugin) => plugin.pluginName === currentlyActiveTab),
    [allPluginsData, currentlyActiveTab]
  );

  const detailMetrics = useMemo(() => {
    if (!currentlySelectedPlugin || !currentlySelectedPlugin.migrations.length) return null;
    const migration = currentlySelectedPlugin.migrations[0];
    return {
      healthLabels: Object.keys(migration.checkRuns || {}),
      healthData: Object.keys(migration.checkRuns || {}).map(k => migration.checkRuns[k] === "success" ? 1 : 0.3),
      healthColors: Object.keys(migration.checkRuns || {}).map(k => migration.checkRuns[k] === "success" ? "#10B981" : "#EF4444"),
      changeStats: [migration.additions, migration.deletions, migration.changedFiles],
      summaryPie: migration.migrationStatus === 'SUCCESS' ? [{ name: "Success", value: 1 }, { name: "Null", value: 0 }] : [{ name: "Success", value: 0 }, { name: "Null", value: 1 }],
      statusPie: [{ name: "Migration", value: 1 }, { name: "PR", value: 1 }]
    };
  }, [currentlySelectedPlugin]);

  // ── ROUTING ENGINE ──
  const renderMainContent = () => {
    if (currentlyActiveTab === "Global Overview") {
      return (
        <div className="tab-content" key="global">
          <div className="glass-card summary-card reveal-node" style={{ marginBottom: "40px" }}>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Total Code Additions</span>
                <span className="summary-value" style={{ color: "var(--accent-green)" }}>+{grandTotalAdditions.toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Code Deletions</span>
                <span className="summary-value" style={{ color: "var(--accent-red)" }}>-{grandTotalDeletions.toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Files Sanitized</span>
                <span className="summary-value" style={{ color: "var(--accent-secondary)" }}>{grandTotalFilesChanged.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="charts-grid reveal-node animate-delay-2">
            <div className="glass-card chart-card chart-full">
              <BarChart
                labels={overviewLabels}
                data={overviewData}
                colors={undefined}
                title="Overall Code Modifications per Plugin"
                rotateLabel={30}
              />
            </div>
          </div>
        </div>
      );
    }

    if (currentlyActiveTab === "Topic Dashboards") {
      return (
        <div className="tab-content" key="topics">
          <div className="glass-card chart-card chart-full reveal-node">
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
      );
    }

    if (currentlyActiveTab === "Methodology") {
      return (
        <div className="tab-content" key="methodology">
           <div className="glass-card reveal-node" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', lineHeight: '1.6' }}>
             <h2 className="title" style={{ fontSize: '32px', marginBottom: '20px' }}>Methodology & Rules</h2>
             
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
      );
    }

    if (currentlyActiveTab === "Data Explorer") {
      return (
        <div className="tab-content animate-fade-up" key="explorer">
          <DataExplorer plugins={allPluginsData} onPluginSelect={setCurrentlyActiveTab} />
        </div>
      );
    }

    // Detail View: Target Plugin Analytics
    if (currentlySelectedPlugin && currentlySelectedPlugin.migrations.length > 0) {
      const migrationData = currentlySelectedPlugin.migrations[0];
      return (
        <div className="tab-content" key={currentlyActiveTab}>
          <div className="reveal-node" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
            <button 
              onClick={() => setCurrentlyActiveTab("Data Explorer")}
              className="tab-btn"
            >
              ← Explorer Console
            </button>
            
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', letterSpacing: '2px', marginBottom: '4px' }}>PLUG-IN DIAGNOSTICS</p>
              <h2 className="title">
                <span className="plugin-name">{currentlySelectedPlugin.pluginName}</span>
              </h2>
            </div>
            
            <a
              href={currentlySelectedPlugin.pluginRepository}
              target="_blank"
              rel="noreferrer"
              className="tab-btn active"
            >
              Source Code
            </a>
          </div>

          {/* ── MODULAR TELEMETRY HUD ── */}
          <div className="summary-grid" style={{ marginBottom: '40px' }}>
            <div className="telemetry-module reveal-node animate-delay-1">
              <div className="telemetry-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <span className="telemetry-label">Active Recipe</span>
              <span className="telemetry-value">{migrationData.migrationName}</span>
            </div>

            <div className="telemetry-module reveal-node animate-delay-2">
              <div className="telemetry-icon-box" style={{ color: migrationData.migrationStatus === 'SUCCESS' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <span className="telemetry-label">Migration Status</span>
              <span className={`badge badge-${(migrationData.migrationStatus || "unknown").toLowerCase()}`}>
                {migrationData.migrationStatus || "unknown"}
              </span>
            </div>

            <div className="telemetry-module reveal-node animate-delay-3">
              <div className="telemetry-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
              </div>
              <span className="telemetry-label">Pull Request</span>
              <span className={`badge badge-${(migrationData.pullRequestStatus || "unknown").toLowerCase()}`}>
                {(migrationData.pullRequestStatus || "unknown").replace("_", " ")}
              </span>
            </div>

            <div className="telemetry-module reveal-node animate-delay-4">
              <div className="telemetry-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <span className="telemetry-label">Entity Version</span>
              <span className="telemetry-value">{migrationData.pluginVersion || "N/A"}</span>
            </div>

            <div className="telemetry-module reveal-node animate-delay-5" style={{ gridColumn: 'span 2' }}>
              <div className="telemetry-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              </div>
              <span className="telemetry-label">Modernization Topics</span>
              <div className="tag-hud" style={{ marginTop: '4px' }}>
                {(migrationData.tags || []).map((tag) => (
                  <span key={tag} className="tag-node">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <div className={`system-intent reveal-node animate-delay-5 ${migrationData.migrationStatus === 'SUCCESS' ? 'success' : 'fail'}`} style={{ marginBottom: '40px' }}>
            <h3 className="title" style={{ fontSize: '24px', marginBottom: '16px' }}>Recommended Action Steps</h3>
            <p style={{ color: 'var(--text-primary)', opacity: 0.8, fontSize: '16px', lineHeight: '1.7' }}>
              {migrationData.migrationStatus === 'SUCCESS' 
                ? "The OpenRewrite transformation succeeded. Analysts should manually inspect the Pull Request diff link highlighted above. Maintainers must verify backward compatibility before approving the PR merge." 
                : "Transformation Failed. The automated script collided with custom logic. Maintainers are recommended to manually evaluate the native 'pom.xml' for conflicting dependency bounds and test configurations."}
            </p>
          </div>

          <div className="charts-grid">
            <div className="glass-card chart-card animate-fade-up delay-2">
              <PieChart
                data={detailMetrics?.summaryPie || []}
                title="Check Runs Summary"
                colors={["#10B981", "#EF4444"]}
              />
            </div>

            <div className="glass-card chart-card animate-fade-up delay-2">
              <BarChart
                labels={["Additions", "Deletions", "Changed Files"]}
                data={detailMetrics?.changeStats || []}
                colors={["#10B981", "#EF4444", "#3B82F6"]}
                title="Code Changes"
              />
            </div>

            <div className="glass-card chart-card chart-full animate-fade-up delay-3">
              <BarChart
                labels={detailMetrics?.healthLabels || []}
                data={detailMetrics?.healthData || []}
                colors={detailMetrics?.healthColors || []}
                title="CI Check Runs (Green = Pass, Red = Null/Fail)"
                rotateLabel={40}
                yMax={1}
                yFormatter={(v: number) => (v >= 1 ? "Pass" : "Fail")}
              />
            </div>

            <div className="glass-card chart-card animate-fade-up delay-4">
              <PieChart
                data={detailMetrics?.statusPie || []}
                title="Migration & PR Status"
                colors={["#10B981", "#8b5cf6"]}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="glass-card animate-fade-up" style={{ textAlign: "center", padding: "60px" }}>
         <h2>No migration statistics are available for '{currentlyActiveTab}' at this time.</h2>
      </div>
    );
  };

  return (
    <div 
      className="container" 
      onMouseMove={handleMouseMove}
      style={{ '--mouse-x': `${mousePos.x}px`, '--mouse-y': `${mousePos.y}px` } as React.CSSProperties}
    >
      <div className="header reveal-node">
        <h1 className="title">
          Plugin <span className="plugin-name">Modernizer</span>
          <br />Stats Visualization
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px", letterSpacing: "1px" }}>JENKINS ECOSYSTEM CONSOLE</p>
      </div>

      <div className="tabs-container reveal-node animate-delay-1">
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
          Topic Matrix
        </button>
        <button
          onClick={() => setCurrentlyActiveTab("Data Explorer")}
          className={`tab-btn ${currentlyActiveTab === "Data Explorer" ? "active" : ""}`}
        >
          Explorer
        </button>
        <button
          onClick={() => setCurrentlyActiveTab("Methodology")}
          className={`tab-btn ${currentlyActiveTab === "Methodology" ? "active" : ""}`}
        >
          Methodology
        </button>
      </div>

      {renderMainContent()}
    </div>
  );
}

export default Dashboard;
