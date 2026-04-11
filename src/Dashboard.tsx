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

const formatLabel = (str: string) => {
  if (!str) return str;
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const SEMANTIC_INSIGHTS: Record<string, { insight: string; severity: 'danger' | 'warning' | 'success' | 'info' }> = {
  "Parent Pom": { insight: "Legacy build config. Risk: Missing automated security and performance patches.", severity: "warning" },
  "Bom": { insight: "Missing Bill of Materials alignment. Risk: Runtime dependency conflicts.", severity: "danger" },
  "Skip-verification": { insight: "Security verification bypassed. Risk: Unverified code execution.", severity: "danger" },
  "Jth": { insight: "Legacy Jenkins Test Harness. Risk: Inconsistent/Flaky CI results.", severity: "warning" },
  "Success": { insight: "Fully aligned with modern Jenkins core standards.", severity: "success" },
  "Failure": { insight: "Modernization failed. Requires immediate manual code adjustment.", severity: "danger" },
  "Aborted": { insight: "Modernization session manually terminated.", severity: "warning" },
  "Pending": { insight: "Modernization queued in engine.", severity: "info" },
  "Modernizer": { insight: "OpenRewrite recipe execution status.", severity: "info" },
  "Topic": { insight: "Specific modernization feature set.", severity: "info" },
  "Default": { insight: "Analyzed ecosystem metric.", severity: "info" },
  "Other Topics": { insight: "Grouped secondary modernization targets.", severity: "info" }
};

function Dashboard() {
  const allPluginsData = allPluginsRaw as unknown as PluginData[];
  const [currentlyActiveTab, setCurrentlyActiveTab] = useState<string>("Global Overview");
  const [explorerSearch, setExplorerSearch] = useState<string>("");
  const [explorerFilter, setExplorerFilter] = useState<string>("ALL");
  const [activeQueueFilter, setActiveQueueFilter] = useState<string | null>(null);
  const [workbenchSearch, setWorkbenchSearch] = useState<string>("");

  const pluginsWithValidMigrationData = useMemo(() => 
    allPluginsData.filter(plugin => plugin.migrations && plugin.migrations.length > 0),
    [allPluginsData]
  );

  // ── STRATEGIC WORKBENCH LOGIC ──
  const workbenchMetrics = useMemo(() => {
    const outdatedPlugins = pluginsWithValidMigrationData.filter(p => {
      const ver = p.migrations[0].jenkinsVersion || "0.0";
      // Identify legacy Jenkins baselines (pre-2.400)
      return ver.startsWith("1.") || (ver.startsWith("2.") && parseFloat(ver.split(".")[1]) < 400);
    });

    const failedPlugins = pluginsWithValidMigrationData.filter(p => {
      const status = p.migrations[0].migrationStatus;
      return status && (status.toLowerCase() === 'fail' || status.toLowerCase() === 'failure');
    });

    // Identify most frequent failure tag
    const failureTags: Record<string, number> = {};
    failedPlugins.forEach(p => {
      (p.migrations[0].tags || []).forEach(t => {
        failureTags[t] = (failureTags[t] || 0) + 1;
      });
    });
    const mainRiskArea = Object.entries(failureTags).sort((a,b) => b[1] - a[1])[0]?.[0] || "General Infrastructure";

    // Strategic Roadmap Ranking: Sort by absolute modification volume ("Impact")
    const roadmapList = [...pluginsWithValidMigrationData]
      .sort((a,b) => {
        const migA = a.migrations[0];
        const migB = b.migrations[0];
        const intensityA = (migA.additions || 0) + (migA.deletions || 0);
        const intensityB = (migB.additions || 0) + (migB.deletions || 0);
        return intensityB - intensityA;
      })
      .slice(0, 20)
      .map(p => p.pluginName);

    const modernizedPlugins = pluginsWithValidMigrationData.filter(p => {
      const status = p.migrations[0].migrationStatus;
      return status && status.toLowerCase() === 'success';
    });

    return {
      totalCount: allPluginsData.length,
      modernizedPercentage: Math.round((modernizedPlugins.length / pluginsWithValidMigrationData.length) * 100),
      legacyAlignmentPercentage: Math.round((outdatedPlugins.length / pluginsWithValidMigrationData.length) * 100),
      legacyAlignmentNames: outdatedPlugins.map(p => p.pluginName),
      mainRiskArea,
      roadmapList
    };
  }, [pluginsWithValidMigrationData, allPluginsData.length]);

  const activateRoadmap = () => {
    setActiveQueueFilter('ROADMAP');
    setWorkbenchSearch(""); // Reset workbench search on activation
    setCurrentlyActiveTab("Strategic Workbench");
  };

  const activateLegacyView = () => {
    setActiveQueueFilter('LEGACY_ALIGNMENT');
    setWorkbenchSearch(""); // Reset workbench search on activation
    setCurrentlyActiveTab("Strategic Workbench");
  };

  // ── ROUTING & HISTORY SYNCHRONIZATION ──
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/", "").toLowerCase();
      if (!hash || hash === "") {
        setCurrentlyActiveTab("Global Overview");
        return;
      }

      const tabMap: Record<string, string> = {
        "overview": "Global Overview",
        "topics": "Topic Dashboards",
        "explorer": "Data Explorer",
        "workbench": "Strategic Workbench",
        "methodology": "Methodology"
      };

      if (tabMap[hash]) {
        setCurrentlyActiveTab(tabMap[hash]);
      } else if (hash.startsWith("plugin/")) {
        const pluginName = decodeURIComponent(hash.replace("plugin/", ""));
        const exists = allPluginsData.some(p => p.pluginName === pluginName);
        if (exists) setCurrentlyActiveTab(pluginName);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [allPluginsData]);

  useEffect(() => {
    const tabToHash: Record<string, string> = {
      "Global Overview": "overview",
      "Topic Dashboards": "topics",
      "Data Explorer": "explorer",
      "Strategic Workbench": "workbench",
      "Methodology": "methodology"
    };

    const targetHash = tabToHash[currentlyActiveTab] 
      ? `/${tabToHash[currentlyActiveTab]}`
      : `/plugin/${encodeURIComponent(currentlyActiveTab)}`;

    if (window.location.hash !== `#${targetHash}`) {
      window.history.pushState(null, "", `#${targetHash}`);
    }
  }, [currentlyActiveTab]);

  // ── V10: GLOBAL SCROLL NORMALIZATION ──
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentlyActiveTab]);



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
      .map(tag => {
        const formatted = formatLabel(tag);
        const metadata = SEMANTIC_INSIGHTS[formatted] || SEMANTIC_INSIGHTS["Default"];
        return { 
          name: formatted, 
          value: globalTagCounts[tag],
          insight: metadata.insight,
          severity: metadata.severity
        };
      })
      .sort((a,b) => b.value - a.value);
    
    const top6 = rawPieData.slice(0, 6);
    const otherPieCount = rawPieData.slice(6).reduce((acc, curr) => acc + curr.value, 0);
    if (otherPieCount > 0) {
      top6.push({ 
        name: "Other Topics", 
        value: otherPieCount,
        insight: SEMANTIC_INSIGHTS["Other Topics"].insight,
        severity: SEMANTIC_INSIGHTS["Other Topics"].severity
      });
    }

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
    const checkRunKeys = Object.keys(migration.checkRuns || {});
    
    const healthInsights = checkRunKeys.map(k => {
      const formatted = formatLabel(k);
      return SEMANTIC_INSIGHTS[formatted]?.insight || SEMANTIC_INSIGHTS["Default"].insight;
    });

    const healthSeverities = checkRunKeys.map(k => {
      const status = migration.checkRuns[k];
      return status === "success" ? "success" : "danger";
    });

    return {
      healthLabels: checkRunKeys.map(k => formatLabel(k)),
      healthData: checkRunKeys.map(k => migration.checkRuns[k] === "success" ? 1 : 0.3),
      healthInsights,
      healthSeverities,
      changeStats: [migration.additions, migration.deletions, migration.changedFiles],
      summaryPie: migration.migrationStatus === 'SUCCESS' 
        ? [
            { name: "Success", value: 1, insight: SEMANTIC_INSIGHTS["Success"].insight, severity: "success" }, 
            { name: "Null", value: 0, severity: "info" }
          ] 
        : [
            { name: "Success", value: 0, insight: SEMANTIC_INSIGHTS["Success"].insight, severity: "success" }, 
            { name: "Failure", value: 1, insight: SEMANTIC_INSIGHTS["Failure"].insight, severity: "danger" }
          ],
      statusPie: [
        { name: "Automation Status", value: 1, insight: "Status of the OpenRewrite modernization recipe.", severity: "info" }, 
        { name: "Manual Review", value: 1, insight: "Human verification required for complex changes.", severity: "warning" }
      ]
    };
  }, [currentlySelectedPlugin]);

  // ── ROUTING ENGINE ──
  const renderMainContent = () => {
    if (currentlyActiveTab === "Global Overview") {
      return (
        <div className="tab-content" key="global" style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
          
          {/* 🥇 TIER 1: EXECUTIVE HUB */}
          <div className="executive-hero-grid reveal-node" style={{ '--delay': '100ms' } as React.CSSProperties}>
            <div className="hero-card info">
              <span className="hero-label">Registry Size</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span className="hero-value mono">{workbenchMetrics.totalCount}</span>
                <span className="mono" style={{ fontSize: '10px', opacity: 0.4 }}>[ENTITIES]</span>
              </div>
              <p className="hero-desc">Total Jenkins entities currently tracked in the modernization index.</p>
            </div>
            
            <div className="hero-card risk" onClick={activateLegacyView} style={{ cursor: 'pointer' }}>
              <span className="hero-label">Legacy Core Alignment</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span className="hero-value mono">{workbenchMetrics.legacyAlignmentPercentage}%</span>
                <span className="mono" style={{ fontSize: '10px', opacity: 0.4 }}>[COMPLIANCE_GAP]</span>
              </div>
              <p className="hero-desc">Entities requiring alignment with modern Jenkins baselines (&gt; 2.400).</p>
            </div>

            <div className="hero-card success">
              <span className="hero-label">Success Rate</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span className="hero-value mono">{workbenchMetrics.modernizedPercentage}%</span>
                <span className="mono" style={{ fontSize: '10px', opacity: 0.4 }}>[SUCCESS_INDEX]</span>
              </div>
              <p className="hero-desc">Percentage of ecosystem successfully migrated to modern standards.</p>
            </div>
          </div>

          {/* 🥈 TIER 2: ANALYTICAL BREAKDOWN (CHARTS) */}
          <div className="charts-grid reveal-node" style={{ '--delay': '300ms' } as React.CSSProperties}>
            <div className="glass-card chart-card chart-full">
              <BarChart
                labels={overviewLabels}
                data={overviewData}
                colors={undefined}
                title="Code Mutation Intensity"
                rotateLabel={30}
              />
            </div>
          </div>

          {/* 🥉 TIER 3: STRATEGIC ACTION HUB */}
          <div className="strategic-hub reveal-node" style={{ '--delay': '500ms' } as React.CSSProperties}>
            <div className="hub-briefing">
              <div className="system-status-badge">
                <span className="pulse-dot warning"></span> Project Roadmap Active
              </div>
              <h2 className="hub-title">Command Center <span className="mono text-accent">Briefing</span></h2>
              <p className="hub-subtitle">Tactical diagnostics identified for human intervention.</p>
            </div>

            <div className="hub-grid">
              <div className="hub-card risk clickable" onClick={activateLegacyView}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="hub-card-label">Legacy Core Alignment</span>
                  <span className="hub-card-val mono">{workbenchMetrics.legacyAlignmentPercentage}%</span>
                </div>
                <p className="hub-card-desc">Entities requiring modernization to meet Core standards.</p>
                <div className="hub-card-action">Inspect Legacy Plugins →</div>
              </div>

              <div className="hub-card risk">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="hub-card-label">Primary Risk Vector</span>
                  <span className="hub-card-val mono" style={{ fontSize: '14px' }}>{workbenchMetrics.mainRiskArea.replace(/_/g, ' ').toUpperCase()}</span>
                </div>
                <p className="hub-card-desc">Most frequent failure point.</p>
                <div className="hub-card-action secondary">Diagnostic Locked</div>
              </div>

              <div className="hub-card roadmap clickable" onClick={activateRoadmap}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="hub-card-label">Priority Roadmap</span>
                  <span className="hub-card-val mono">Top 20</span>
                </div>
                <p className="hub-card-desc">Strategic targets identified by code intensity.</p>
                <div className="hub-card-action active">Activate Work Queue →</div>
              </div>
            </div>
          </div>



          {/* SECONDARY METRICS */}
          <div className="glass-card summary-card reveal-node animate-delay-3">
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Total Code Additions</span>
                <span className="summary-value mono" style={{ color: "var(--accent-green)" }}>+{grandTotalAdditions.toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Code Deletions</span>
                <span className="summary-value mono" style={{ color: "var(--accent-red)" }}>-{grandTotalDeletions.toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Files Sanitized</span>
                <span className="summary-value mono" style={{ color: "var(--accent-secondary)" }}>{grandTotalFilesChanged.toLocaleString()}</span>
              </div>
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
          <div className="recipe-grid reveal-node">
            <div className="glass-card recipe-card">
              <div className="telemetry-icon-box" style={{ marginBottom: '20px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 className="mono-title">SOURCE_OF_TRUTH</h3>
              <p className="recipe-desc">All telemetry is ingested at build-time directly from the <code>metadata-plugin-modernizer</code> repository via automated GitHub Actions.</p>
            </div>

            <div className="glass-card recipe-card">
              <div className="telemetry-icon-box" style={{ marginBottom: '20px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3 className="mono-title">SYNC_PIPELINE</h3>
              <p className="recipe-desc">Autonomous CI/CD pipeline executes nightly at 00:00 UTC, parsing raw JSON artifacts and publishing schema configurations.</p>
            </div>

            <div className="glass-card recipe-card">
              <div className="telemetry-icon-box" style={{ marginBottom: '20px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </div>
              <h3 className="mono-title">RULES_ENGINE</h3>
              <p className="recipe-desc">Definitions for Migration Status, PR lifecycle, and OpenRewrite topic mapping used for ecosystem standardization.</p>
            </div>
          </div>
        </div>
      );
    }

    if (currentlyActiveTab === "Data Explorer") {
      return (
        <div className="tab-content animate-fade-up" key="explorer">
          <DataExplorer 
            plugins={allPluginsData} 
            onPluginSelect={setCurrentlyActiveTab}
            externalSearch={explorerSearch}
            roadmapList={workbenchMetrics.roadmapList}
            legacyAlignmentList={workbenchMetrics.legacyAlignmentNames}
            onClearExternal={() => setExplorerSearch("")}
          />
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

          <div className="summary-grid" style={{ marginBottom: '40px' }}>
            <div className="telemetry-module reveal-node animate-delay-1">
              <div className="telemetry-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <span className="telemetry-label">Active Recipe</span>
              <span className="telemetry-value mono">{migrationData.migrationName}</span>
            </div>

            <div className="telemetry-module reveal-node animate-delay-2">
              <div className="telemetry-icon-box" style={{ color: migrationData.migrationStatus === 'SUCCESS' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <span className="telemetry-label">Migration Status</span>
              <span className={`badge badge-${(migrationData.migrationStatus || "unknown").toLowerCase()}`}>
                {formatLabel(migrationData.migrationStatus || "unknown")}
              </span>
            </div>

            <div className="telemetry-module reveal-node animate-delay-3">
              <div className="telemetry-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
              </div>
              <span className="telemetry-label">Pull Request</span>
              <span className={`badge badge-${(migrationData.pullRequestStatus || "unknown").toLowerCase()}`}>
                {formatLabel(migrationData.pullRequestStatus || "unknown")}
              </span>
            </div>

            <div className="telemetry-module reveal-node animate-delay-4">
              <div className="telemetry-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <span className="telemetry-label">Entity Version</span>
              <span className="telemetry-value mono">{migrationData.pluginVersion || "N/A"}</span>
            </div>

            <div className="telemetry-module reveal-node animate-delay-5" style={{ gridColumn: 'span 2' }}>
              <div className="telemetry-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              </div>
              <span className="telemetry-label">Modernization Topics</span>
              <div className="tag-hud mono" style={{ marginTop: '4px' }}>
                {(migrationData.tags || []).map((tag) => (
                  <span key={tag} className="tag-node">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="glass-card chart-card animate-fade-up delay-2">
              <BarChart
                labels={detailMetrics.healthLabels}
                data={detailMetrics.healthData}
                insights={detailMetrics.healthInsights}
                severities={detailMetrics.healthSeverities}
                yMax={1}
                title="Ecosystem Health Checks"
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
          </div>
        </div>
      );
    }
    if (currentlyActiveTab === "Strategic Workbench") {
      const baseQueue = activeQueueFilter === 'ROADMAP' ? workbenchMetrics.roadmapList : workbenchMetrics.legacyAlignmentNames;
      const filteredQueue = (baseQueue || []).filter(name => 
        name.toLowerCase().includes(workbenchSearch.toLowerCase())
      );

      return (
        <div className="tab-content animate-fade-up" key="workbench">
          <div className="tactical-board standalone reveal-node">
            <div className="board-header" style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p className="hero-label" style={{ margin: 0 }}>Tactical Workbench</p>
                <h2 className="title" style={{ margin: 0, textTransform: 'uppercase' }}>
                  {activeQueueFilter === 'ROADMAP' ? 'Priority Roadmap targets' : 'Legacy Core Alignment Index'}
                </h2>
              </div>
              <button className="tab-btn" onClick={() => setCurrentlyActiveTab("Global Overview")}>
                ← Exit to Command Center
              </button>
            </div>

            <div className="workbench-actions" style={{ marginBottom: '40px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
                <input 
                  type="text" 
                  placeholder="Filter active queue plugins..." 
                  value={workbenchSearch}
                  onChange={(e) => setWorkbenchSearch(e.target.value)}
                  className="workbench-search-input"
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.3s'
                  }}
                />
                <span className="mono" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3, fontSize: '10px' }}>
                  [Results: {filteredQueue.length}]
                </span>
              </div>
            </div>
            
            <div className="task-grid">
              {filteredQueue.map((pluginName) => {
                const pData = allPluginsData.find(p => p.pluginName === pluginName);
                const rawStatus = pData?.migrations[0]?.migrationStatus || "UNKNOWN";
                const displayStatus = rawStatus.replace(/_/g, ' ');
                return (
                  <div key={pluginName} className="tactical-task-card">
                    <div className="task-body">
                      <span className="task-plugin-name mono">{pluginName}</span>
                      <div className="task-meta">
                        <span className={`task-badge ${rawStatus.toLowerCase()}`}>{displayStatus}</span>
                      </div>
                    </div>
                    <button 
                      className="task-action-btn"
                      onClick={() => setCurrentlyActiveTab(pluginName)}
                    >
                      Diagnostics →
                    </button>
                  </div>
                );
              })}
              {filteredQueue.length === 0 && (
                <div style={{ padding: '80px', textAlign: 'center', opacity: 0.5, gridColumn: '1 / -1' }}>
                  <p className="mono">No matches found in active queue</p>
                </div>
              )}
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
      style={{ 
        '--mouse-x': `${mousePos.x}px`, 
        '--mouse-y': `${mousePos.y}px`,
        background: `radial-gradient(1200px circle at ${mousePos.x}px ${mousePos.y}px, rgba(59, 130, 246, 0.08), transparent 80%), #030712` 
      } as React.CSSProperties}
    >
      <div className="header reveal-node">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span className="system-status-tag">
            <span className="pulse-dot"></span> SYSTEM_LIVE
          </span>
          <span className="version-tag">STABLE_v1.2.4</span>
        </div>
        <h1 className="title">
          CLI Telemetry <span className="plugin-name">Console</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", letterSpacing: "2px", fontWeight: 600, fontFamily: 'var(--mono)' }}>PLUGIN_MODERNIZER_ENGINE</p>
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
