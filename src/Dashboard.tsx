import "./Dashboard.css";
import BarChart from "./components/BarChart";
import PieChart from "./components/PieChart";
import DataExplorer from "./components/DataExplorer";
import allPluginsRaw from "./data/all_plugins.json";
import { useState, useMemo, useEffect, useRef } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

// --- ASSETS ---
import architectureImage from "./assets/ARCHITECTURE DIAGRAM (EXPLANATION SECTION) - visual selection.png";

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
  key?: string;
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

const DIAGNOSTIC_ACTIONS: Record<string, string> = {
  "Checkstyle": "Standardize Java coding style to meet Jenkins UI criteria.",
  "ESLint": "Resolve architectural JavaScript violations in UI components.",
  "Jenkins Security Scan": "CRITICAL: Remediate security vulnerabilities identified by the automated scanner.",
  "BOM": "Modernize dependency management via Bill of Materials (BOM) alignment.",
  "Incrementals": "Enable Incrementals support for rapid development cycles.",
  "Java Compiler": "Address compilation warnings and JDK compatibility flags.",
  "SpotBugs": "Eliminate static analysis bugs and potential null pointer risks.",
  "Tests": "Debug CI/CD test failures to ensure regression safety.",
  "Baseline": "Upgrade Jenkins core baseline to >= 2.440.3 for modern API support."
};

// ── V32: KINETIC MARQUEE COMPONENT ──
const MarqueeHeader: React.FC<{ text: string }> = ({ text }) => {
  const items = Array(10).fill(`${text} - SYSTEM INTEGRITY`);
  return (
    <div className="marquee-wrapper reveal-node">
      <div className="marquee-content">
        {items.map((item, idx) => (
          <div key={idx} className="marquee-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            {item}
          </div>
        ))}
        {items.map((item, idx) => (
          <div key={`dup-${idx}`} className="marquee-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

function Dashboard() {
  const allPluginsData = allPluginsRaw as unknown as PluginData[];
  const [currentlyActiveTab, setCurrentlyActiveTab] = useState<string>("Global Overview");

  const handleDrillDown = (pluginName: string) => {
    setCurrentlyActiveTab(pluginName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [topicFilter, setTopicFilter] = useState<string>("ALL");
  const [prFilter, setPrFilter] = useState<string>("ALL");

  // Dropdown States
  const [isSeverityOpen, setIsSeverityOpen] = useState(false);
  const [isTopicOpen, setIsTopicOpen] = useState(false);
  const [isPROpen, setIsPROpen] = useState(false);

  const [activeQueueFilter, setActiveQueueFilter] = useState<string | null>(null);
  const [workbenchPage, setWorkbenchPage] = useState(1);
  const itemsPerPage = 16;

  const [isScanning, setIsScanning] = useState(false);
  const handleSystemSweep = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 2000);
  };

  // ── HOOK: CINEMATIC SCROLL TRACKER (V21) ──
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── HOOK: SCROLL REVEAL ENGINE (V17.3) ──

  const topicColorMap: Record<string, string> = {
    'DEPENDENCIES': '#AAFF00',      /* Toxic Green */
    'SKIP_VERIFICATION': '#FF003C', /* Crimson */
    'TESTING': '#D4ED2C',           /* Neon Lime */
    'MIGRATION': '#00D2FF',         /* Electric Blue */
    'CHORE': '#FF00FF',             /* Deep Magenta */
    'DEVELOPER': '#00FF9F',         /* Matrix Green */
    'BOM': '#C084FC',               /* Neon Purple */
    'PARENT_POM': '#FF3131',         /* Fluorescent Red */
    'BUILD': '#0FF0FC',              /* Electric Cyan */
    'SECURITY': '#8B5CF6',           /* Deep Violet */
    'UI': '#BD00FF',                 /* Purple Thunder */
  };

  const VIBRANT_PALETTE = [
    "#D4ED2C", /* Neon Lime */
    "#FF00FF", /* Magenta */
    "#00D2FF", /* Blue */
    "#FF003C", /* Crimson */
    "#00FF9F", /* Matrix Green */
    "#C084FC", /* Purple */
    "#AAFF00", /* Toxic Green */
    "#0FF0FC"  /* Cyan */
  ];

  const getTopicColor = (topic: string, index: number = 0) => {
    if (!topic) return '#94a3b8';
    const key = topic.replace(/-/g, '_').toUpperCase();
    for (const [k, v] of Object.entries(topicColorMap)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    // V26.6: Use rotating palette for unique colors if not explicitly mapped
    return VIBRANT_PALETTE[index % VIBRANT_PALETTE.length];
  };

  // Ref for click-outside detection
  const commandBarRef = useRef<HTMLDivElement>(null);

  // ── HOOK: SCROLL REVEAL ENGINE (V17.3) ──
  const useIntersectionReveal = (options = {}) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      }, { threshold: 0.1, ...options });

      if (ref.current) observer.observe(ref.current);
      return () => { if (ref.current) observer.unobserve(ref.current); };
    }, [options]);
    return ref;
  };

  const heroCard1Ref = useIntersectionReveal();
  const heroCard2Ref = useIntersectionReveal();
  const heroCard3Ref = useIntersectionReveal();
  const hubCard1Ref = useIntersectionReveal();
  const hubCard2Ref = useIntersectionReveal();
  const hubCard3Ref = useIntersectionReveal();
  const chartRef = useIntersectionReveal();
  const hudRef = useIntersectionReveal();

  // Flag to prevent filter reset during strategic navigation
  const isStrategicNavRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandBarRef.current && !commandBarRef.current.contains(event.target as Node)) {
        setIsSeverityOpen(false);
        setIsTopicOpen(false);
        setIsPROpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pluginsWithValidMigrationData = useMemo(() =>
    allPluginsData.filter(plugin => plugin.migrations && plugin.migrations.length > 0),
    [allPluginsData]
  );

  // ── DYNAMIC TOPIC EXTRACTION ──
  const uniqueTopics = useMemo(() => {
    const tags = new Set<string>();
    pluginsWithValidMigrationData.forEach(p => {
      (p.migrations[0].tags || []).forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [pluginsWithValidMigrationData]);

  // ── STRATEGIC WORKBENCH LOGIC ──
  const workbenchMetrics = useMemo(() => {
    // Stage 1: Base Filtered (Static logic for metrics)
    const baseList = pluginsWithValidMigrationData.filter(p => {
       const migration = p.migrations[0];
       if (!migration) return false;
       
       // Standard hub filters apply here
       const matchesTopic = topicFilter === "ALL" || (migration.tags || []).includes(topicFilter);
       const prStatus = (migration.pullRequestStatus || "UNKNOWN").toUpperCase();
       
       let finalPrStatus = prStatus;
       if (finalPrStatus === "DRAFT") finalPrStatus = "UNKNOWN";
       if (finalPrStatus === "FAILURE") finalPrStatus = "FAIL";
       const matchesPR = prFilter === "ALL" || finalPrStatus === prFilter.toUpperCase();
       
       // Severity Match
       let matchesSeverity = true;
       if (severityFilter !== "ALL") {
         const mStatus = (migration.migrationStatus || "").toLowerCase();
         const ver = p.migrations[0].jenkinsVersion || "0.0";
         const isOutdated = ver.startsWith("1.") || (ver.startsWith("2.") && parseFloat(ver.split(".")[1]) < 400);

         if (severityFilter === "CRITICAL") matchesSeverity = mStatus === "fail" || mStatus === "failure";
         else if (severityFilter === "WARNING") matchesSeverity = isOutdated || mStatus === "aborted";
         else if (severityFilter === "OPTIMIZED") matchesSeverity = mStatus === "success";
       }

       return matchesTopic && matchesPR && matchesSeverity;
    });

    const outdatedPlugins = baseList.filter(p => {
      const ver = p.migrations[0].jenkinsVersion || "0.0";
      return ver.startsWith("1.") || (ver.startsWith("2.") && parseFloat(ver.split(".")[1]) < 400);
    });

    const failedPlugins = baseList.filter(p => {
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
    const mainRiskArea = Object.entries(failureTags).sort((a, b) => b[1] - a[1])[0]?.[0] || "General Infrastructure";

    // Strategic Roadmap Ranking
    const roadmapList = [...baseList]
      .sort((a, b) => {
        const migA = a.migrations[0];
        const migB = b.migrations[0];
        const intensityA = (migA.additions || 0) + (migA.deletions || 0);
        const intensityB = (migB.additions || 0) + (migB.deletions || 0);
        return intensityB - intensityA;
      })
      .slice(0, 20)
      .map(p => p.pluginName);

    const modernizedPlugins = baseList.filter(p => {
      const status = p.migrations[0].migrationStatus;
      return status && status.toLowerCase() === 'success';
    });

    return {
      totalCount: allPluginsData.length,
      filteredCount: baseList.length,
      modernizedPercentage: baseList.length > 0 ? Math.round((modernizedPlugins.length / baseList.length) * 100) : 0,
      legacyAlignmentPercentage: baseList.length > 0 ? Math.round((outdatedPlugins.length / baseList.length) * 100) : 0,
      legacyAlignmentNames: outdatedPlugins.map(p => p.pluginName),
      mainRiskArea: formatLabel(mainRiskArea),
      roadmapList
    };
  }, [pluginsWithValidMigrationData, topicFilter, prFilter, severityFilter, allPluginsData.length]);

  // ── THE FILTER PIVOT ENGINE ──
  const filteredEcosystem = useMemo(() => {
    return pluginsWithValidMigrationData.filter(plugin => {
      const migration = plugin.migrations[0];
      if (!migration) return false;

      // Search Match (Support Strategic Keywords)
      let matchesSearch = true;
      if (globalSearch) {
        if (globalSearch === "ROADMAP_TOP_20") {
          matchesSearch = workbenchMetrics?.roadmapList?.includes(plugin.pluginName) || false;
        } else if (globalSearch === "LEGACY_BASELINE") {
          matchesSearch = workbenchMetrics?.legacyAlignmentNames?.includes(plugin.pluginName) || false;
        } else {
          matchesSearch = plugin.pluginName.toLowerCase().includes(globalSearch.toLowerCase());
        }
      }
      if (!matchesSearch) return false;

      // Topic Match
      const matchesTopic = topicFilter === "ALL" || (migration.tags || []).includes(topicFilter);
      if (!matchesTopic) return false;

      // PR Match
      let latestPrStatus = (migration.pullRequestStatus || "UNKNOWN").toUpperCase();
      if (latestPrStatus === "FAILURE") latestPrStatus = "FAIL";
      // Synchronize DRAFT to UNKNOWN
      if (latestPrStatus === "DRAFT") latestPrStatus = "UNKNOWN";

      const matchesPR = prFilter === "ALL" || latestPrStatus === prFilter.toUpperCase();
      if (!matchesPR) return false;

      // Severity Match
      const status = (migration.migrationStatus || "").toLowerCase();
      const ver = migration.jenkinsVersion || "0.0";
      const isOutdated = ver.startsWith("1.") || (ver.startsWith("2.") && parseFloat(ver.split(".")[1]) < 400);

      if (severityFilter === "CRITICAL") return status === "fail" || status === "failure";
      if (severityFilter === "WARNING") return isOutdated || status === "aborted";
      if (severityFilter === "OPTIMIZED") return status === "success";

      return true;
    });
  }, [pluginsWithValidMigrationData, globalSearch, severityFilter, topicFilter, prFilter, workbenchMetrics]);

  const activateRoadmap = () => {
    isStrategicNavRef.current = true;
    setActiveQueueFilter('ROADMAP');
    setCurrentlyActiveTab("Strategic Workbench");
    // Reset the flag after the transition cycle
    setTimeout(() => { isStrategicNavRef.current = false; }, 100);
  };

  const activateLegacyView = () => {
    isStrategicNavRef.current = true;
    setActiveQueueFilter('LEGACY_ALIGNMENT');
    setCurrentlyActiveTab("Strategic Workbench");
    // Reset the flag after the transition cycle
    setTimeout(() => { isStrategicNavRef.current = false; }, 100);
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
  }, [currentlyActiveTab, allPluginsData]);

  // ── FILTER RESET ENGINE ──
  // Reset all global filters when moving between primary analytical tiers
  useEffect(() => {
    // If this is a strategic navigation (from Roadmap/Legacy links), DO NOT RESET
    if (isStrategicNavRef.current) return;

    // Data Explorer should maintain the current Command Hub filters for deep analysis
    if (currentlyActiveTab === "Data Explorer") return;

    // We only reset if we aren't drilling down into a specific plugin
    const isPluginView = !["Global Overview", "Topic Dashboards", "Data Explorer", "Strategic Workbench", "Methodology"].includes(currentlyActiveTab);

    if (!isPluginView) {
      setGlobalSearch("");
      setSeverityFilter("ALL");
      topicFilter !== "ALL" && setTopicFilter("ALL");
      prFilter !== "ALL" && setPrFilter("ALL");
      setWorkbenchPage(1); // Reset pagination on tab change

      // Close any open liquid dropdowns
      setIsSeverityOpen(false);
      setIsTopicOpen(false);
      setIsPROpen(false);
    }
  }, [currentlyActiveTab]);

  // ── V10: GLOBAL SCROLL NORMALIZATION ──
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentlyActiveTab]);

  const [isHovering, setIsHovering] = useState(false);

  // ── V32: NARRATIVE OBSERVER HOOK ──
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-focus');
        } else {
          entry.target.classList.remove('in-focus');
        }
      });
    }, { threshold: 0.6 });

    const blocks = document.querySelectorAll('.narrative-block');
    blocks.forEach(b => observer.observe(b));

    return () => observer.disconnect();
  }, [currentlyActiveTab]);

  // ── V32: GLOBAL SCROLL TRACKER ──
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const grandTotalAdditions = useMemo(() =>
    filteredEcosystem.reduce((acc, plugin) => acc + (plugin.migrations[0].additions || 0), 0)
    , [filteredEcosystem]);

  const grandTotalDeletions = useMemo(() =>
    filteredEcosystem.reduce((acc, plugin) => acc + (plugin.migrations[0].deletions || 0), 0)
    , [filteredEcosystem]);

  const grandTotalFilesChanged = useMemo(() =>
    filteredEcosystem.reduce((acc, plugin) => acc + (plugin.migrations[0].changedFiles || 0), 0)
    , [filteredEcosystem]);

  const { topPieData, overviewLabels, overviewData } = useMemo(() => {
    const globalTagCounts: Record<string, number> = {};
    filteredEcosystem.forEach(plugin => {
      (plugin.migrations[0].tags || []).forEach(tag => {
        globalTagCounts[tag] = (globalTagCounts[tag] || 0) + 1;
      });
    });

    const rawPieData = Object.keys(globalTagCounts)
      .map((tag, idx) => {
        const formatted = formatLabel(tag);
        const metadata = SEMANTIC_INSIGHTS[formatted] || SEMANTIC_INSIGHTS["Default"];
        const topicColor = getTopicColor(tag, idx); // V26.6: Pass index for unique palette rotation
        return {
          name: formatted,
          value: globalTagCounts[tag],
          insight: metadata.insight,
          severity: metadata.severity,
          itemStyle: { color: topicColor } // Force color sync across tabs
        };
      })
      .sort((a, b) => b.value - a.value);

    const top6 = rawPieData.slice(0, 6);
    const otherPieCount = rawPieData.slice(6).reduce((acc, curr) => acc + curr.value, 0);
    if (otherPieCount > 0) {
      top6.push({
        name: "Other Topics",
        value: otherPieCount,
        insight: SEMANTIC_INSIGHTS["Other Topics"].insight,
        severity: SEMANTIC_INSIGHTS["Other Topics"].severity,
        itemStyle: { color: "#94a3b8" } /* Neutral slate for grouped topics */
      });
    }

    const scaled = [...filteredEcosystem]
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
  }, [filteredEcosystem]);

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
      ],
      findings: checkRunKeys
        .filter(k => migration.checkRuns[k] !== "success")
        .map(k => ({
          issue: formatLabel(k),
          recommendation: DIAGNOSTIC_ACTIONS[Object.keys(DIAGNOSTIC_ACTIONS).find(key => k.includes(key)) || "Default"] || "Analyze CI logs for specific failure root cause."
        })),
      surgicalPlan: [
        ...(migration.jenkinsVersion && (migration.jenkinsVersion.startsWith("1.") || (migration.jenkinsVersion.startsWith("2.") && parseFloat(migration.jenkinsVersion.split(".")[1]) < 440))
          ? [{ task: "Baseline Upgrade", action: DIAGNOSTIC_ACTIONS["Baseline"] }] : []),
        ...(migration.migrationStatus !== "SUCCESS"
          ? [{ task: "Recipe Remediation", action: "Review OpenRewrite 'modernizer' logs and resolve syntax conflicts." }] : []),
        ...(checkRunKeys.some(k => k.includes("Security")) && migration.checkRuns[checkRunKeys.find(k => k.includes("Security"))!] !== "success"
          ? [{ task: "Security Hardening", action: DIAGNOSTIC_ACTIONS["Jenkins Security Scan"] }] : [])
      ]
    };
  }, [currentlySelectedPlugin]);

  const renderCommandBar = () => (
    <div
      className="glass-card command-hub-card reveal-node dynamic-island"
      ref={commandBarRef}
      style={{
        padding: '16px 30px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        alignItems: 'center',
        zIndex: 1100, /* V32: Boosted to ensure no overlap with plugin list */
        margin: '0 auto 60px',
        width: '100%',
        maxWidth: '100%',
        position: 'sticky', /* V32: Strategic Elevation */
        top: '20px'
      }}
    >
      <div style={{ flex: 1.5, minWidth: '280px' }}>
        <p className="hero-label" style={{ fontSize: '10px', marginBottom: '8px', opacity: 0.5 }}>Identity Search</p>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Filter plugins"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '14px 20px',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.3s'
            }}
          />
        </div>
      </div>

      {/* 2. RISK SELECTOR */}
      <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
        <p className="hero-label" style={{ fontSize: '10px', marginBottom: '8px', opacity: 0.5 }}>Risk Severity</p>
        <button
          onClick={() => { setIsSeverityOpen(!isSeverityOpen); setIsTopicOpen(false); setIsPROpen(false); }}
          className="tab-btn clickable"
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="telemetry-icon-box" style={{ width: '28px', height: '28px', marginBottom: 0, color: 'var(--accent-red)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="telemetry-value" style={{ fontSize: '12px' }}>{severityFilter === 'ALL' ? 'All Risks' : formatLabel(severityFilter)}</span>
            </div>
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {isSeverityOpen && (
          <div className="glass-card reveal-node" style={{ position: 'absolute', top: '100%', marginTop: '12px', width: '100%', background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '8px', zIndex: 1001, boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            {[
              { value: 'ALL', label: 'All Risks', color: '#fff' },
              { value: 'CRITICAL', label: 'Fail', color: 'var(--accent-red)' },
              { value: 'WARNING', label: 'Warning', color: 'var(--accent-amber)' },
              { value: 'OPTIMIZED', label: 'Success', color: 'var(--accent-neon)' }
            ].map(opt => (
              <div
                key={opt.value}
                onClick={() => { setSeverityFilter(opt.value); setIsSeverityOpen(false); }}
                className={`cmd-dropdown-item ${severityFilter === opt.value ? 'active' : ''}`}
                style={{
                  color: opt.color,
                  fontWeight: '900',
                  background: severityFilter === opt.value ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: severityFilter === opt.value ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  zIndex: 1001
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color }}></div>
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. CATEGORY SELECTOR */}
      <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
        <p className="hero-label" style={{ fontSize: '10px', marginBottom: '8px', opacity: 0.5 }}>Technical Topic</p>
        <button
          onClick={() => { setIsTopicOpen(!isTopicOpen); setIsSeverityOpen(false); setIsPROpen(false); }}
          className="tab-btn clickable"
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="telemetry-icon-box" style={{ width: '28px', height: '28px', marginBottom: 0, color: 'var(--accent-secondary)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="telemetry-value" style={{ fontSize: '12px' }}>{topicFilter === 'ALL' ? 'All Categories' : formatLabel(topicFilter)}</span>
            </div>
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {isTopicOpen && (
          <div className="glass-card reveal-node" style={{ position: 'absolute', top: '100%', marginTop: '12px', width: '100%', maxHeight: '400px', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '8px', zIndex: 1000, boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            <div
              onClick={() => { setTopicFilter('ALL'); setIsTopicOpen(false); }}
              className={`cmd-dropdown-item ${topicFilter === 'ALL' ? 'active' : ''}`}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }}></div>
              All Categories
            </div>
            {uniqueTopics.map(t => {
              const topicColor = getTopicColor(t);
              return (
                <div
                  key={t}
                  onClick={() => { setTopicFilter(t); setIsTopicOpen(false); }}
                  className="cmd-dropdown-item"
                  style={{
                    color: topicColor,
                    fontWeight: '900',
                    background: topicFilter === t ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: topicFilter === t ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: topicColor, flexShrink: 0 }}></div>
                  <span>{formatLabel(t)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. PR LIFECYCLE SELECTOR */}
      <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
        <p className="hero-label" style={{ fontSize: '10px', marginBottom: '8px', opacity: 0.5 }}>PR Lifecycle</p>
        <button
          onClick={() => { setIsPROpen(!isPROpen); setIsSeverityOpen(false); setIsTopicOpen(false); }}
          className="tab-btn clickable"
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="telemetry-icon-box" style={{ width: '28px', height: '28px', marginBottom: 0, color: '#60A5FA' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" /></svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="telemetry-value" style={{ fontSize: '12px' }}>{prFilter === 'ALL' ? 'All Stages' : formatLabel(prFilter)}</span>
            </div>
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {isPROpen && (
          <div className="glass-card reveal-node" style={{ position: 'absolute', top: '100%', marginTop: '12px', width: '100%', background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '8px', zIndex: 1000, boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            {[
              { value: 'ALL', label: 'All Stages', color: '#fff' },
              { value: 'MERGED', label: 'Merged', color: '#FF007F' },
              { value: 'OPEN', label: 'Open', color: '#00FFFF' },
              { value: 'CLOSED', label: 'Closed', color: 'var(--accent-red)' },
              { value: 'UNKNOWN', label: 'Unknown', color: '#FF5500' }
            ].map(opt => (
              <div
                key={opt.value}
                onClick={() => { setPrFilter(opt.value); setIsPROpen(false); }}
                className={`cmd-dropdown-item ${prFilter === opt.value ? 'active' : ''}`}
                style={{
                  color: opt.color,
                  fontWeight: '900',
                  background: prFilter === opt.value ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: prFilter === opt.value ? '1px solid rgba(255,255,255,0.1)' : 'none'
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color }}></div>
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)', opacity: 0.6, letterSpacing: '1px' }}>ECOSYSTEM_COVERAGE</div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-neon)' }}>
            {Math.round((filteredEcosystem.length / allPluginsData.length) * 100)}%
          </div>
        </div>
        
        <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

        <button 
          onClick={handleSystemSweep}
          className={`tab-btn clickable ${isScanning ? 'active' : ''}`}
          style={{ 
            padding: '12px', 
            borderRadius: '14px', 
            background: isScanning ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            minWidth: '44px',
            position: 'relative',
            overflow: 'hidden'
          }}
          title="System Sweep (Refresh Data Visuals)"
        >
          <svg 
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" 
            style={{ 
              animation: isScanning ? 'spin 1s linear infinite' : 'none',
              opacity: isScanning ? 1 : 0.7
            }}
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {isScanning && <div className="scan-line" />}
        </button>
      </div>
    </div>
  );

  // ── ROUTING ENGINE ──
  const renderMainContent = () => {
    if (currentlyActiveTab === "Global Overview") {
      return (
        <div className="tab-content" key="global" style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>

          {/* 🥇 TIER 1: EXECUTIVE HUB */}

          <MarqueeHeader text="EXECUTIVE SUMMARY" />
          <div className="executive-hero-grid" style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}>
            <div ref={heroCard1Ref} className="hero-card info kinetic-card tier-1 in-view liquid-glass">
              <div className="kinetic-text">
                <span className="hero-label">Registry Segment</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="hero-value mono">{workbenchMetrics.filteredCount}</span>
                  <span className="mono" style={{ fontSize: '10px', opacity: 0.4 }}>[ENTITIES]</span>
                </div>
                <p className="hero-desc">Entities matching current command filters in the modernization index.</p>
              </div>
            </div>

            <div ref={heroCard2Ref} className="hero-card risk-glow kinetic-card tier-2 in-view liquid-glass" onClick={activateLegacyView} style={{ cursor: 'pointer' }}>
              <div className="kinetic-text">
                <span className="hero-label">Legacy Core Alignment</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="hero-value mono">{workbenchMetrics.legacyAlignmentPercentage}%</span>
                  <span className="mono" style={{ fontSize: '10px', opacity: 0.4 }}>[COMPLIANCE_GAP]</span>
                </div>
                <p className="hero-desc">Entities requiring alignment with modern Jenkins baselines (&gt; 2.400).</p>
              </div>
            </div>

            <div ref={heroCard3Ref} className="hero-card success-glow kinetic-card tier-3 in-view liquid-glass">
              <div className="kinetic-text">
                <span className="hero-label">Success Rate</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="hero-value mono">{workbenchMetrics.modernizedPercentage}%</span>
                  <span className="mono" style={{ fontSize: '10px', opacity: 0.4 }}>[SUCCESS_INDEX]</span>
                </div>
                <p className="hero-desc">Percentage of ecosystem successfully migrated to modern standards.</p>
              </div>
            </div>
          </div>

          {/* 🥈 TIER 2: ANALYTICAL BREAKDOWN (CHARTS) */}
          <div ref={chartRef} className="charts-grid kinetic-card animate-delay-4" style={{ marginTop: '0px' }}>
            <div className="glass-card chart-card chart-full">
              <div className="kinetic-text">
                <BarChart
                  labels={overviewLabels}
                  data={overviewData}
                  colors={undefined}
                  title="Code Mutation Intensity"
                  rotateLabel={30}
                  onItemClick={handleDrillDown}
                />
              </div>
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
              <div ref={hubCard1Ref} className="hub-card risk clickable kinetic-card animate-delay-1" onClick={activateLegacyView}>
                <div className="kinetic-text">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="hub-card-label">Legacy Core Alignment</span>
                    <span className="hub-card-val mono">{workbenchMetrics.legacyAlignmentPercentage}%</span>
                  </div>
                  <p className="hub-card-desc">Entities requiring modernization to meet Core standards.</p>
                  <div className="hub-card-action">Inspect Legacy Plugins →</div>
                </div>
              </div>

              <div ref={hubCard2Ref} className="hub-card risk kinetic-card animate-delay-2">
                <div className="kinetic-text">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="hub-card-label">Primary Risk Vector</span>
                    <span className="hub-card-val mono" style={{ fontSize: '14px' }}>{formatLabel(workbenchMetrics.mainRiskArea)}</span>
                  </div>
                  <p className="hub-card-desc">Most frequent failure point.</p>
                  <div className="hub-card-action secondary">Diagnostic Locked</div>
                </div>
              </div>

              <div ref={hubCard3Ref} className="hub-card roadmap clickable kinetic-card animate-delay-3" onClick={activateRoadmap}>
                <div className="kinetic-text">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="hub-card-label">Priority Roadmap</span>
                    <span className="hub-card-val mono">Top 20</span>
                  </div>
                  <p className="hub-card-desc">Strategic targets identified by code intensity.</p>
                  <div className="hub-card-action active">Activate Work Queue →</div>
                </div>
              </div>
            </div>
          </div>



          {/* 🥉 TIER 3: MUTATION ANALYTICS HUD */}
          <div ref={hudRef} className="mutation-hud kinetic-card animate-delay-5">

            {/* 1. CODE CHURN & IMPACT */}
            <div className="hud-module liquid-glass">
              <div className="kinetic-text">
                <div className="hud-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                  Modernization Impact
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div className="hud-value-large">{((grandTotalAdditions + grandTotalDeletions) / 1000).toFixed(1)}K</div>
                  <div style={{ paddingBottom: '16px', fontSize: '12px', color: 'var(--accent-secondary)' }}>MUTATIONS</div>
                </div>
                <p className="hero-desc" style={{ fontSize: '12px', marginBottom: '20px' }}>Aggregate code churn across the modernized registry.</p>
              </div>

              <div className="impact-meter-container liquid">
                <div
                  className="impact-bar-pos liquid"
                  style={{ width: `${(grandTotalAdditions / (grandTotalAdditions + grandTotalDeletions || 1)) * 100}%` }}
                ></div>
                <div
                  className="impact-bar-neg liquid"
                  style={{ width: `${(grandTotalDeletions / (grandTotalAdditions + grandTotalDeletions || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* 2. SANITIZATION HEALTH INDEX */}
            <div className="hud-module liquid-glass" style={{ alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
              <div className="kinetic-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <div className="hud-label" style={{ marginBottom: '20px', alignSelf: 'flex-start' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  Health Index
                </div>

                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                  <svg className="radial-progress-svg">
                    <circle className="radial-bg" cx="50" cy="50" r="45"></circle>
                    <circle
                      className="radial-active"
                      cx="50" cy="50" r="45"
                      style={{
                        strokeDasharray: '282.7',
                        strokeDashoffset: (282.7 - (282.7 * (grandTotalFilesChanged / (workbenchMetrics.totalCount * 5 || 1)))) // Estimating 5 files per plugin avg for goal
                      }}
                    ></circle>
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div className="mono" style={{ fontSize: '20px', fontWeight: 800 }}>{Math.min(100, Math.round((grandTotalFilesChanged / (workbenchMetrics.totalCount * 5 || 1)) * 100))}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. REGISTRY COVERAGE */}
            <div className="hud-module liquid-glass">
              <div className="kinetic-text">
                <div className="hud-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                  Registry Span
                </div>
                <div className="hud-value-large">{grandTotalFilesChanged.toLocaleString()}</div>
                <div className="mono" style={{ fontSize: '10px', opacity: 0.4, marginBottom: 'auto' }}>FILES_CLEANED</div>
              </div>
            </div>

          </div>
        </div>
      );
    }

    if (currentlyActiveTab === "Topic Dashboards") {
      return (
        <div className="tab-content" key="topics">
          <div className="hero-card chart-heavy reveal-node">
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h2 className="title mb-4" style={{ fontSize: '28px', color: 'var(--text-primary)' }}>Ecosystem Modernization <span style={{ color: 'var(--accent-primary)' }}>Topic Vectors</span></h2>
              <p className="mb-8" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>Distribution of OpenRewrite tags mapping the specific focus of plugin modernizations (e.g. Parent POM, BOM, JSR-305).</p>
            </div>
            {topPieData.length > 0 ? (
              <PieChart
                data={topPieData}
                title="Plugin Topic Aggregation"
                onItemClick={(topic) => {
                  setGlobalSearch(topic);
                  setCurrentlyActiveTab("Strategic Workbench");
                }}
              />
            ) : (
              <div style={{ color: "#9CA3AF", textAlign: "center", padding: "40px" }}>No topic tags found in dataset.</div>
            )}
          </div>
        </div>
      );
    }


    if (currentlyActiveTab === "Data Explorer") {
      return (
        <div className="tab-content animate-fade-up" key="explorer-tab-container">
          <ErrorBoundary>
            <DataExplorer
              plugins={filteredEcosystem}
              onPluginSelect={handleDrillDown}
              externalSearch={globalSearch}
              externalMigrationFilter={severityFilter}
              externalPrFilter={prFilter}
              roadmapList={workbenchMetrics.roadmapList}
              legacyAlignmentList={workbenchMetrics.legacyAlignmentNames}
              onClearExternal={() => setGlobalSearch("")}
            />
          </ErrorBoundary>
        </div>
      );
    }

    // Detail View: Target Plugin Analytics
    if (currentlySelectedPlugin && currentlySelectedPlugin.migrations.length > 0 && detailMetrics) {
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              </div>
              <span className="telemetry-label">Active Recipe</span>
              <span className="telemetry-value mono">{migrationData.migrationName}</span>
            </div>

            <div className="telemetry-module reveal-node animate-delay-2">
              <div className="telemetry-icon-box" style={{ color: migrationData.migrationStatus === 'SUCCESS' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
              <span className="telemetry-label">Migration Status</span>
              <span className={`badge badge-${(migrationData.migrationStatus || "unknown").toLowerCase()}`}>
                {formatLabel(migrationData.migrationStatus || "unknown")}
              </span>
            </div>

            <div className="telemetry-module reveal-node animate-delay-3">
              <div className="telemetry-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" /></svg>
              </div>
              <span className="telemetry-label">Pull Request</span>
              <span className={`badge badge-${(migrationData.pullRequestStatus || "unknown").toLowerCase()}`}>
                {formatLabel(migrationData.pullRequestStatus || "unknown")}
              </span>
            </div>

            <div className="telemetry-module reveal-node animate-delay-4">
              <div className="telemetry-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
              </div>
              <span className="telemetry-label">Entity Version</span>
              <span className="telemetry-value mono">{migrationData.pluginVersion || "N/A"}</span>
            </div>

            <div className="telemetry-module reveal-node animate-delay-5" style={{ gridColumn: 'span 2' }}>
              <div className="telemetry-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
              </div>
              <span className="telemetry-label">Modernization Topics</span>
              <div className="tag-hud mono" style={{ marginTop: '4px' }}>
                {(migrationData.tags || []).map((tag) => (
                  <span key={tag} className="tag-node">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="charts-grid" style={{ marginBottom: '40px' }}>
            <div className="glass-card chart-card reveal-node" style={{ '--delay': '400ms' } as React.CSSProperties}>
              <BarChart
                labels={detailMetrics.healthLabels}
                data={detailMetrics.healthData}
                insights={detailMetrics.healthInsights}
                severities={detailMetrics.healthSeverities}
                yMax={1}
                title="Ecosystem Health Checks"
              />
            </div>

            <div className="glass-card reveal-node" style={{ '--delay': '500ms', padding: '24px' } as React.CSSProperties}>
              <h3 className="mono" style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px', textTransform: 'uppercase' }}>Surgical Action Plan</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {detailMetrics.surgicalPlan.length > 0 ? detailMetrics.surgicalPlan.map((step, idx) => (
                  <div key={idx} className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-secondary)', marginBottom: '4px' }}>STEP_0{idx + 1} // {step.task}</div>
                    <div style={{ fontSize: '13px', color: '#F3F4F6', lineHeight: '1.4' }}>{step.action}</div>
                  </div>
                )) : (
                  <div className="glass-card success" style={{ padding: '20px', textAlign: 'center' }}>
                    <div className="mono" style={{ color: 'var(--accent-green)', fontWeight: '700' }}>STATUS: OPTIMIZED</div>
                    <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>No immediate surgical intervention required.</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card reveal-node" style={{ '--delay': '600ms', padding: '24px' } as React.CSSProperties}>
            <h3 className="mono" style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px', textTransform: 'uppercase' }}>Diagnostic Findings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {detailMetrics.findings.length > 0 ? detailMetrics.findings.map((f, idx) => (
                <div key={idx} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  <div className="mono" style={{ color: '#EF4444', fontSize: '11px', fontWeight: '800', marginBottom: '4px' }}>FINDING: {f.issue.toUpperCase()}</div>
                  <div style={{ fontSize: '13px', opacity: 0.8 }}>{f.recommendation}</div>
                </div>
              )) : (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: '#64748b' }}>
                  Systems scan complete. Zero critical diagnostic blockers found.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    if (currentlyActiveTab === "Strategic Workbench") {
      const baseQueue = activeQueueFilter === 'ROADMAP' ? workbenchMetrics.roadmapList : workbenchMetrics.legacyAlignmentNames;
      const filteredQueue = baseQueue || [];
      const totalPages = Math.ceil(filteredQueue.length / itemsPerPage);
      const paginatedQueue = filteredQueue.slice((workbenchPage - 1) * itemsPerPage, workbenchPage * itemsPerPage);

      return (
        <div className="tab-content animate-fade-up" key="workbench">
          <div className="tactical-board standalone reveal-node">
            <div className="board-header" style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p className="hero-label" style={{ margin: 0, color: 'var(--accent-secondary)' }}>SURGICAL_INTERVENTION_CONSOLE</p>
                <h2 className="title" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '12px', verticalAlign: 'middle' }}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                  {activeQueueFilter === 'ROADMAP' ? 'Priority Roadmap' : 'Legacy Alignment'}
                </h2>
              </div>
              <button className="tab-btn" onClick={() => setCurrentlyActiveTab("Global Overview")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                Dashboard
              </button>
            </div>

            <div className="task-grid">
              {paginatedQueue.map((pluginName) => {
                const pData = allPluginsData.find(p => p.pluginName === pluginName);
                const rawStatus = (pData?.migrations[0]?.migrationStatus || "UNKNOWN").toLowerCase();
                const displayStatus = rawStatus.replace(/_/g, ' ');

                const statusClass = rawStatus === 'success' ? 'status-success' :
                  (rawStatus === 'fail' || rawStatus === 'failure') ? 'status-failure' :
                    'status-pending';

                return (
                  <div
                    key={pluginName}
                    className={`terminal-card clickable kinetic-card in-view ${statusClass}`}
                    onClick={() => handleDrillDown(pluginName)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="task-body">
                      <span className="terminal-title">{pluginName}</span>
                      <div style={{ marginTop: '8px' }}>
                        <span className={`terminal-badge ${rawStatus === 'fail' ? 'failure' : rawStatus}`}>{displayStatus}</span>
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                  </div>
                );
              })}
              {filteredQueue.length === 0 && (
                <div style={{ padding: '80px', textAlign: 'center', opacity: 0.5, gridColumn: '1 / -1' }}>
                  <p className="mono">No matches found in active queue</p>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '30px', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button 
                    className="tab-btn"
                    disabled={workbenchPage === 1}
                    onClick={() => setWorkbenchPage(p => p - 1)}
                    style={{ opacity: workbenchPage === 1 ? 0.3 : 1, padding: '10px 24px' }}
                  >
                    Prev
                  </button>
                  <span style={{ fontSize: '13px', color: 'white', fontWeight: 'bold' }}>{workbenchPage} / {totalPages || 1}</span>
                  <button 
                    className="tab-btn"
                    disabled={workbenchPage >= totalPages}
                    onClick={() => setWorkbenchPage(p => p + 1)}
                    style={{ opacity: workbenchPage >= totalPages ? 0.3 : 1, padding: '10px 24px' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (currentlyActiveTab === "Architecture") {
      return (
        <div className="tab-content animate-fade-up" key="architecture" style={{ maxWidth: '1000px', margin: '0 auto', paddingTop: '20px' }}>
            <h2 className="title reveal-node" style={{ fontSize: '24px', marginBottom: '40px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>
              Engine <span className="text-accent">Architecture</span>
            </h2>
            <p className="mb-10 text-base font-normal text-white/70 leading-relaxed max-w-3xl reveal-node">
              This project will follow a static, build-time data processing approach to transform Jenkins plugin modernization metadata into actionable visual insights.
            </p>

            <div className="reveal-node" style={{ marginBottom: '60px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-glass)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
              <img src={architectureImage} alt="Static Data Pipeline Architecture" style={{ width: '100%', display: 'block' }} />
            </div>

            <ol className="relative border-l border-white/20 mt-12 mb-16 mx-4 sm:mx-8 reveal-node flex flex-col gap-12 sm:gap-16">
              
              {[
                {
                  num: 1,
                  title: "Data Acquisition",
                  desc: "The application uses the `metadata-plugin-modernizer` repository via automated GitHub Actions as the primary data source. JSON and CSV files are fetched directly during build process.",
                  colorVar: "var(--accent-secondary)",
                  imgSrc: "src\assets\data_acquisition_blueprint.png"
                },
                {
                  num: 2,
                  title: "Processing & Aggregation",
                  desc: "A build-time layer parses schema datasets, extracts keys such as `migrationStatus`, and aggregates outcomes into optimized structural JSON outputs.",
                  colorVar: "var(--accent-amber)"
                },
                {
                  num: 3,
                  title: "Data Validation",
                  desc: "Schema validation applies default fallbacks and gracefully handles missing properties across datasets to ensure strict UI rendering stability.",
                  colorVar: "var(--accent-amber)"
                },
                {
                  num: 4,
                  title: "Static Site Generation",
                  desc: "The frontend framework computes the JSON dataset artifacts into a scalable React & TypeScript build natively, eliminating continuous runtime APIs.",
                  colorVar: "var(--accent-primary)"
                },
                {
                  num: 5,
                  title: "Visualization Layer",
                  desc: "Metrics are painted across highly interactive Apache ECharts, visualizing priority rankings, continuous integrations breakdowns, and distribution vectors.",
                  colorVar: "var(--accent-primary)",
                  imgSrc: "/visualization_layer_blueprint.png"
                },
                {
                  num: 6,
                  title: "User Interaction & UX",
                  desc: "Usability architecture driven entirely by responsive, executive interactive filtering interfaces sorting telemetry data live based on user input loops.",
                  colorVar: "var(--accent-primary)"
                },
                {
                  num: 7,
                  title: "Plugin Reporting",
                  desc: "Dedicated visualization matrix for isolated plugin entities parsing missing BOMs, automated PR deployment statuses, and direct repository networking.",
                  colorVar: "var(--accent-primary)"
                },
                {
                  num: 8,
                  title: "Automation Stack",
                  desc: "An automated Continuous Integration pipeline validates dataset fetching, schema computation, and redeploys automatically via webhook routines.",
                  colorVar: "var(--accent-neon)",
                  imgSrc: "/automation_stack_blueprint.png"
                },
                {
                  num: 9,
                  title: "Deployment Target",
                  desc: "Fully compiled environments map directly to GitHub Pages or `stats.jenkins.io` server architectures ensuring immense public request resilience.",
                  colorVar: "var(--accent-neon)"
                },
                {
                  num: 10,
                  title: "Extensibility",
                  desc: "Comprehensive documentation maps core visualization data structures so developers can graft native logic rules directly into broader Jenkins ecosystems.",
                  colorVar: "var(--accent-neon)"
                }
              ].map((item) => (
                <li key={item.num} className="ml-5 sm:ml-10 group" style={{ marginBottom: '80px', position: 'relative' }}>
                  <span className="absolute flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full -left-[11px] sm:-left-3 ring-8" style={{ background: '#0a0d14', boxShadow: '0 0 0 8px #0a0d14', zIndex: 10 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.colorVar, boxShadow: `0 0 10px ${item.colorVar}, 0 0 20px ${item.colorVar}` }}></div>
                  </span>
                  
                  {/* Echoistic Card Container */}
                  <div className="architecture-card pulse-glow-fx p-8 sm:p-12" style={{ 
                    background: 'var(--bg-glass)', 
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: 'clamp(16px, 4vw, 24px)', 
                    position: 'relative',
                    overflow: 'hidden',
                    maxWidth: '800px',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px color-mix(in srgb, ${item.colorVar} 10%, transparent)` // Base echo
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
                    // Dynamic bright echo on hover
                    e.currentTarget.style.boxShadow = `0 12px 40px color-mix(in srgb, ${item.colorVar} 15%, transparent), 0 0 0 2px color-mix(in srgb, ${item.colorVar} 40%, transparent), 0 0 30px color-mix(in srgb, ${item.colorVar} 30%, transparent)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    // Revert to soft echo
                    e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px color-mix(in srgb, ${item.colorVar} 10%, transparent)`;
                  }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '4px',
                      height: '100%',
                      background: item.colorVar,
                      opacity: 0.8,
                      boxShadow: `0 0 20px ${item.colorVar}`
                    }}></div>

                    <h3 className="flex items-center mb-6 text-xl sm:text-2xl font-bold tracking-wide" style={{ color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                      <span style={{ lineHeight: '1.3' }}>{item.title}</span>
                    </h3>

                    {/* Integrated Blueprint Images with Animations */}
                    {item.imgSrc && (
                       <div style={{ 
                         marginBottom: '28px', 
                         borderRadius: '16px', 
                         overflow: 'hidden', 
                         border: `1px solid color-mix(in srgb, ${item.colorVar} 30%, transparent)`,
                         boxShadow: `0 8px 24px rgba(0,0,0,0.5)`,
                         position: 'relative'
                       }}>
                         <div className="scanline" style={{ position: 'absolute', width: '100%', height: '8px', background: `color-mix(in srgb, ${item.colorVar} 40%, transparent)`, boxShadow: `0 0 10px ${item.colorVar}`, opacity: 0.8, zIndex: 5, pointerEvents: 'none' }}></div>
                         <img src={item.imgSrc} className="w-full h-48 sm:h-72 object-cover" alt={`${item.title} Architecture Blueprint`} style={{ filter: 'brightness(0.9) contrast(1.1)', transition: 'transform 3s ease' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'} />
                       </div>
                    )}

                    <div className="text-base sm:text-lg font-light tracking-wide pt-2" style={{ color: 'rgba(255,255,255,0.85)', lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: item.desc.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 6px; font-family: var(--mono); font-size: 14px; color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1)">$1</code>') }} />
                  </div>
                </li>
              ))}
            </ol>
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
    >

      {/* 🌊 PARALLAX WATERMARK ARTISTRY */}
      <div
        className="parallax-bg-text parallax-1"
        style={{ transform: `translateY(calc(var(--mouse-y) * -0.05)) translateX(calc(var(--mouse-x) * -0.02))` }}
      >
        MODERNIZER
      </div>
      <div
        className="parallax-bg-text parallax-2"
        style={{ transform: `translateY(calc(var(--mouse-y) * -0.02)) translateX(calc(var(--mouse-x) * -0.1))` }}
      >
        JENKINS
      </div>
      <div
        className="parallax-bg-text parallax-3"
        style={{ 
          transform: `translateY(calc(var(--mouse-y) * -0.08)) translateX(calc(var(--mouse-x) * -0.05))`,
          opacity: 0.02
        }}
      >
        ECOSYSTEM
      </div>

      <div className={`header reveal-node ${isScrolled ? 'scrolled' : ''}`}
        style={{
          transform: isScrolled ? `scale(${Math.max(0.6, 1 - (scrollY / 1000))}) translateY(${scrollY * 0.2}px)` : 'none',
          opacity: isScrolled ? Math.max(0.2, 1 - (scrollY / 500)) : 1,
          filter: isScrolled ? `blur(${Math.min(10, scrollY / 50)}px)` : 'none',
          transition: 'all 0.1s linear',
          pointerEvents: isScrolled ? 'none' : 'auto',
          zIndex: 5
        }}
      >
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 w-full max-w-6xl mx-auto px-4 md:px-0">
          
          {/* Logo */}
          <div className="flex-shrink-0 relative group">
            <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/e/e9/Jenkins_logo.svg" 
              alt="Jenkins Logo" 
              className="w-24 sm:w-28 md:w-32 h-auto drop-shadow-[0_0_24px_rgba(255,255,255,0.3)] transition-transform duration-500 hover:scale-105" 
            />
          </div>

          {/* Text Content */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left pt-2 md:pt-4">
            <h1 className="title font-black leading-[1.1] tracking-tight mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-[64px] text-white">
               Jenkins Plugin <br className="hidden md:block" />
               <span className="plugin-name" style={{ backgroundImage: 'linear-gradient(45deg, var(--accent-primary), var(--accent-neon))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>Modernization Insights</span>
            </h1>

            <div className="flex flex-col gap-3 relative border-t md:border-t-0 md:border-l-[3px] border-white/20 pt-5 md:pt-0 md:pl-6 max-w-3xl">
              <div className="absolute top-0 left-[-3px] w-[3px] h-0 md:h-full bg-gradient-to-b from-[var(--accent-primary)] to-[var(--accent-neon)] hidden md:block"></div>
              
              <p className="text-white/90 text-lg sm:text-xl md:text-[22px] font-medium leading-relaxed tracking-wide m-0 drop-shadow-md">
                A static analytics dashboard for visualizing Jenkins plugin modernization status and ecosystem health.
              </p>
              
              <p className="text-[color:var(--accent-secondary)] text-xs sm:text-sm md:text-[13px] font-mono uppercase tracking-[0.2em] font-bold mt-1 opacity-90">
                Turning modernization data into actionable insights for Jenkins maintainers
              </p>
            </div>
          </div>
          
        </div>
      </div>

      <div className="tabs-container reveal-node animate-delay-1" role="navigation" aria-label="Operational Mode Switcher">
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
          onClick={() => setCurrentlyActiveTab("Strategic Workbench")}
          className={`tab-btn ${currentlyActiveTab === "Strategic Workbench" ? "active" : ""}`}
        >
          Workbench
        </button>
        <button
          onClick={() => setCurrentlyActiveTab("Data Explorer")}
          className={`tab-btn ${currentlyActiveTab === "Data Explorer" ? "active" : ""}`}
        >
          Explorer
        </button>
        <button
          onClick={() => setCurrentlyActiveTab("Architecture")}
          className={`tab-btn ${currentlyActiveTab === "Architecture" ? "active" : ""}`}
        >
          Architecture
        </button>
      </div>

      {/* 🛠 GLOBAL COMMAND HUB (V15) */}
      {(currentlyActiveTab === "Global Overview" || currentlyActiveTab === "Topic Dashboards" || currentlyActiveTab === "Strategic Workbench" || currentlyActiveTab === "Data Explorer") && renderCommandBar()}

      <main id="main-content">
        {renderMainContent()}
      </main>

    </div>
  );
}

export default Dashboard;
