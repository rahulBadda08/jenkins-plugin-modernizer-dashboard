import "./Dashboard.css";
import DataExplorer from "./components/DataExplorer";
import DashboardTabs from "./components/DashboardTabs";
import SurgeryTray from "./components/SurgeryTray";
import MethodologyPanel from "./components/MethodologyPanel";
import WorkbenchPanel from "./components/WorkbenchPanel";
import OverviewPanel from "./components/OverviewPanel";
import { PluginDetailPanel } from "./components/PluginDetailPanel";
import allPluginsRaw from "./data/all_plugins.json";
import { useState, useMemo, useEffect, useRef } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

// --- ASSETS ---
import jenkinsLogo from "./assets/jenkins-logo.svg";

// ── DOMAIN ARCHITECTURE & STRICT TYPES ──
import type { PluginData, EnrichedPlugin } from "./domain/types";
import { validatePluginDataset } from "./domain/validation";
import { getActiveMigration } from "./domain/migrationPolicy";
import {
  LTS_BASELINE,
  BASELINE_BUCKET_META,
  getBaselineBucket,
  getMigrationBaselineMinor,
  calculateBaselineDrift,
  type BaselineBucket,
} from "./domain/baselineParser";
import { calculateHealthScore, getPluginInsight } from "./domain/scoring";
import { filterPlugins, computeWorkbenchMetrics } from "./domain/selectors";

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


interface VendorDocument extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface VendorHTMLElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

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

const getTopicColor = (topic: string, index: number = 0): string => {
  if (!topic) return '#94a3b8';
  const key = topic.replace(/-/g, '_').toUpperCase();
  for (const [k, v] of Object.entries(topicColorMap)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return VIBRANT_PALETTE[index % VIBRANT_PALETTE.length];
};

function Dashboard() {
  const allPluginsData: PluginData[] = useMemo(() => validatePluginDataset(allPluginsRaw), []);

  // ── V45: PRE-CALCULATE ALL INSIGHTS ──
  const allPluginsWithInsights: EnrichedPlugin[] = useMemo(() => {
    return allPluginsData.map(plugin => {
      const activeMigration = getActiveMigration(plugin);
      return {
        ...plugin,
        activeMigration,
        insight: getPluginInsight(plugin),
        healthScore: calculateHealthScore(plugin)
      };
    });
  }, [allPluginsData]);

  // ── V48: ECOSYSTEM BENCHMARKING DISTRIBUTION ──
  const ecosystemRankingDist = useMemo(() => {
    const scores = allPluginsWithInsights.map(p => p.healthScore).sort((a, b) => a - b);
    return {
      scores,
      getPercentile: (score: number) => {
        const count = scores.filter(s => s < score).length;
        return (count / scores.length) * 100;
      }
    };
  }, [allPluginsWithInsights]);

  const [currentlyActiveTab, setCurrentlyActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return "Global Overview";
    const rawHash = window.location.hash.replace(/^#\/?/, "");
    if (!rawHash || rawHash === "overview") return "Global Overview";
    if (rawHash === "workbench") return "Strategic Workbench";
    if (rawHash === "explorer") return "Data Explorer";
    if (rawHash === "methodology" || rawHash === "method") return "Pipeline Methodology";
    if (rawHash.startsWith("plugin=")) return decodeURIComponent(rawHash.slice(7));
    if (rawHash.startsWith("plugin/")) return decodeURIComponent(rawHash.slice(7));
    return "Global Overview";
  });

  useEffect(() => {
    const getHashForTab = (tab: string): string => {
      if (tab === "Global Overview") return "#overview";
      if (tab === "Strategic Workbench") return "#workbench";
      if (tab === "Data Explorer") return "#explorer";
      if (tab === "Pipeline Methodology") return "#methodology";
      return `#plugin=${encodeURIComponent(tab)}`;
    };

    const targetHash = getHashForTab(currentlyActiveTab);
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, "", targetHash);
    }
  }, [currentlyActiveTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, "");
      if (!rawHash || rawHash === "overview") {
        setCurrentlyActiveTab("Global Overview");
      } else if (rawHash === "workbench") {
        setCurrentlyActiveTab("Strategic Workbench");
      } else if (rawHash === "explorer") {
        setCurrentlyActiveTab("Data Explorer");
      } else if (rawHash === "methodology" || rawHash === "method") {
        setCurrentlyActiveTab("Pipeline Methodology");
      } else if (rawHash.startsWith("plugin=")) {
        setCurrentlyActiveTab(decodeURIComponent(rawHash.slice(7)));
      } else if (rawHash.startsWith("plugin/")) {
        setCurrentlyActiveTab(decodeURIComponent(rawHash.slice(7)));
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // ── V50: THE ORCHESTRATION QUEUE STATE ──
  const [surgeryQueue, setSurgeryQueue] = useState<string[]>([]);
  const toggleQueueItem = (name: string) => {
    setSurgeryQueue(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  // ── THEME ENGINE (V40) ──
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('jenkins-dashboard-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', theme === 'light');
    localStorage.setItem('jenkins-dashboard-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // ── FULL SCREEN ENGINE ──
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as VendorDocument;
      setIsFullscreen(!!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      ));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = (targetElem?: HTMLElement | null) => {
    const elem = (targetElem || document.documentElement) as VendorHTMLElement;
    const doc = document as VendorDocument;
    const isDocFS = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isDocFS) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err: unknown) => console.warn("Fullscreen error:", err));
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || (activeElement as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDrillDown = (pluginName: string) => {
    setCurrentlyActiveTab(pluginName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [baselineFilter, setBaselineFilter] = useState<BaselineBucket | 'ALL'>('ALL');

  const activateBaselineBucket = (bucketLabel: string) => {
    const bucketEntry = (Object.entries(BASELINE_BUCKET_META) as Array<[BaselineBucket, typeof BASELINE_BUCKET_META[BaselineBucket]]>)
      .find(([, meta]) => meta.label === bucketLabel);
    if (!bucketEntry) return;
    setBaselineFilter(bucketEntry[0]);
    setCurrentlyActiveTab("Data Explorer");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      const currentElement = ref.current;
      if (currentElement) observer.observe(currentElement);
      return () => {
        if (currentElement) observer.unobserve(currentElement);
      };
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
  const [isStrategicNav, setIsStrategicNav] = useState(false);

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
    allPluginsWithInsights.filter(plugin => plugin.migrations && plugin.migrations.length > 0),
    [allPluginsWithInsights]
  );

  // ── DYNAMIC TOPIC EXTRACTION ──
  const uniqueTopics = useMemo(() => {
    const tags = new Set<string>();
    pluginsWithValidMigrationData.forEach(p => {
      (p.activeMigration.tags || []).forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [pluginsWithValidMigrationData]);

  // ── STRATEGIC WORKBENCH LOGIC (Domain-Driven Centralized Engine) ──
  const workbenchMetrics = useMemo(() => {
    return computeWorkbenchMetrics(allPluginsWithInsights, allPluginsData.length, {
      topicFilter,
      prFilter,
      severityFilter,
      baselineFilter,
    });
  }, [allPluginsWithInsights, topicFilter, prFilter, severityFilter, baselineFilter, allPluginsData.length]);

  // ── THE FILTER PIVOT ENGINE (Domain-Driven Selector Integration) ──
  const filteredEcosystem = useMemo(() => {
    return filterPlugins(allPluginsWithInsights, {
      globalSearch,
      topicFilter,
      prFilter,
      severityFilter,
      baselineFilter,
      roadmapList: workbenchMetrics?.roadmapList,
      legacyAlignmentNames: workbenchMetrics?.legacyAlignmentNames,
    });
  }, [allPluginsWithInsights, globalSearch, topicFilter, prFilter, severityFilter, baselineFilter, workbenchMetrics]);

  const activateRoadmap = () => {
    setIsStrategicNav(true);
    setActiveQueueFilter('ROADMAP');
    setCurrentlyActiveTab("Strategic Workbench");
  };

  const activateLegacyView = () => {
    setIsStrategicNav(true);
    setActiveQueueFilter('LEGACY_ALIGNMENT');
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
    window.addEventListener("popstate", handleHashChange);
    handleHashChange();
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
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
  // Reset all global filters when moving between primary analytical tiers during render
  const [prevActiveTab, setPrevActiveTab] = useState(currentlyActiveTab);
  if (prevActiveTab !== currentlyActiveTab) {
    setPrevActiveTab(currentlyActiveTab);
    if (!isStrategicNav && currentlyActiveTab !== "Data Explorer") {
      const isPluginView = !["Global Overview", "Topic Dashboards", "Data Explorer", "Strategic Workbench", "Methodology"].includes(currentlyActiveTab);
      if (!isPluginView) {
        setGlobalSearch("");
        setSeverityFilter("ALL");
        setTopicFilter("ALL");
        setPrFilter("ALL");
        setWorkbenchPage(1); // Reset pagination on tab change

        // Close any open liquid dropdowns
        setIsSeverityOpen(false);
        setIsTopicOpen(false);
        setIsPROpen(false);
      }
    }
    if (isStrategicNav) {
      setIsStrategicNav(false);
    }
  }

  // ── V10: GLOBAL SCROLL NORMALIZATION ──
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentlyActiveTab]);

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

  const ecosystemBenchmarks = useMemo(() => {
    const counts: Record<string, { success: number; total: number }> = {};
    allPluginsWithInsights.forEach(p => {
      const migration = p.activeMigration;
      if (!migration || !migration.checkRuns) return;
      Object.entries(migration.checkRuns).forEach(([k, status]) => {
        if (!counts[k]) counts[k] = { success: 0, total: 0 };
        counts[k].total++;
        if (status === "success") counts[k].success++;
      });
    });
    const result: Record<string, number> = {};
    Object.entries(counts).forEach(([k, v]) => {
      result[k] = v.success / v.total;
    });
    return result;
  }, [allPluginsWithInsights]);

  // ── V50: HIGH IMPACT TARGET HEURISTIC ──
  const highImpactTargets = useMemo(() => {
    return [...allPluginsWithInsights]
      .filter(p => !p.insight.issueBreakdown.deprecated.value) // Focus on active plugins for maximum impact
      .map(p => {
        const driftFactor = p.insight.surgical.drift.gap;
        const failFactor = p.insight.checklist.filter(c => c.status === 'failed').length * 10;
        const intensity = (p.activeMigration.additions || 0) + (p.activeMigration.deletions || 0);
        const totalImpact = (driftFactor + failFactor) * (1 + intensity / 5000);
        return { ...p, impactScore: totalImpact };
      })
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5);
  }, [allPluginsWithInsights]);

  const grandTotalAdditions = useMemo(() =>
    filteredEcosystem.reduce((acc, plugin) => acc + (plugin.activeMigration.additions || 0), 0)
    , [filteredEcosystem]);

  const grandTotalDeletions = useMemo(() =>
    filteredEcosystem.reduce((acc, plugin) => acc + (plugin.activeMigration.deletions || 0), 0)
    , [filteredEcosystem]);

  const grandTotalFilesChanged = useMemo(() =>
    filteredEcosystem.reduce((acc, plugin) => acc + (plugin.activeMigration.changedFiles || 0), 0)
    , [filteredEcosystem]);

  const baselineHealthSummary = useMemo(() => {
    const bucketPlugins: Record<BaselineBucket, string[]> = {
      critical: [],
      warning: [],
      aligned: [],
      unspecified: []
    };

    filteredEcosystem.forEach(plugin => {
      const migration = plugin.activeMigration;
      const bucket = getBaselineBucket(getMigrationBaselineMinor(migration));
      bucketPlugins[bucket].push(plugin.pluginName);
    });

    const pieData = (Object.keys(BASELINE_BUCKET_META) as BaselineBucket[]).map(bucket => ({
      name: BASELINE_BUCKET_META[bucket].label,
      value: bucketPlugins[bucket].length,
      insight: BASELINE_BUCKET_META[bucket].insight,
      severity: BASELINE_BUCKET_META[bucket].severity
    }));

    const driftTargets = [...filteredEcosystem]
      .map(plugin => {
        const migration = plugin.activeMigration;
        const baselineVersion = migration.jenkinsVersion || migration.effectiveBaseline || migration.jenkinsBaseline || migration.targetBaseline || "0.0";
        const drift = calculateBaselineDrift(baselineVersion);
        return {
          pluginName: plugin.pluginName,
          gap: drift.gap,
          criticality: drift.criticality
        };
      })
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 10);

    return {
      pieData,
      driftLabels: driftTargets.map(item => item.pluginName),
      driftData: driftTargets.map(item => item.gap),
      driftInsights: driftTargets.map(item => `Drift score ${item.gap} from LTS ${LTS_BASELINE} (${item.criticality.toUpperCase()}).`)
    };
  }, [filteredEcosystem]);

  const { topPieData, overviewLabels, overviewData, integrityLabels, integrityData, integrityInsights } = useMemo(() => {
    const globalTagCounts: Record<string, number> = {};
    filteredEcosystem.forEach(plugin => {
      (plugin.activeMigration.tags || []).forEach(tag => {
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
        totalMods: (plugin.activeMigration.additions || 0) + (plugin.activeMigration.deletions || 0)
      }))
      .sort((a, b) => b.totalMods - a.totalMods);

    const integrityLabels = Object.keys(ecosystemBenchmarks).map(k => formatLabel(k));
    const integrityData = Object.values(ecosystemBenchmarks);
    const integrityInsights = Object.keys(ecosystemBenchmarks).map(k => {
      const formatted = formatLabel(k);
      return SEMANTIC_INSIGHTS[formatted]?.insight || SEMANTIC_INSIGHTS["Default"].insight;
    });

    return {
      topPieData: top6,
      overviewLabels: scaled.map(p => p.name),
      overviewData: scaled.map(p => p.totalMods),
      integrityLabels,
      integrityData,
      integrityInsights
    };
  }, [filteredEcosystem, ecosystemBenchmarks]);


  const currentlySelectedPlugin = useMemo(() =>
    allPluginsWithInsights.find((plugin) => plugin.pluginName === currentlyActiveTab),
    [allPluginsWithInsights, currentlyActiveTab]
  );

  const detailMetrics = useMemo(() => {
    if (!currentlySelectedPlugin) return null;
    const migration = currentlySelectedPlugin.activeMigration;
    const checkRuns = migration.checkRuns || {};
    const checkRunKeys = Object.keys(checkRuns);

    const healthInsights = checkRunKeys.map(k => {
      const formatted = formatLabel(k);
      return SEMANTIC_INSIGHTS[formatted]?.insight || SEMANTIC_INSIGHTS["Default"].insight;
    });

    const healthSeverities = checkRunKeys.map(k => {
      const status = checkRuns[k];
      return status === "success" ? "success" : "danger";
    });

    // ── V45: CONSUME CENTRALIZED DIAGNOSTIC ENGINE ──
    const { actionInsight, priorities, checklist, issueBreakdown, surgical } = getPluginInsight(currentlySelectedPlugin);

    // V48: Comparative Analytics
    const myPercentile = ecosystemRankingDist.getPercentile(currentlySelectedPlugin.healthScore as number);
    const worseThanCount = Math.round(100 - myPercentile);
    const rankingLabel = worseThanCount > 50 ? `WORSE THAN ${worseThanCount}%` : `ELITE TOP ${Math.max(1, Math.round(myPercentile))}%`;
    const rankingSeverity = worseThanCount > 70 ? 'danger' : (worseThanCount > 30 ? 'warning' : 'success');

    return {
      actionInsight,
      priorities,
      checklist,
      issueBreakdown,
      surgical,
      ranking: {
        label: rankingLabel,
        severity: rankingSeverity,
        percentile: myPercentile
      },
      healthLabels: checkRunKeys.map(k => formatLabel(k)),
      healthData: checkRunKeys.map(k => checkRuns[k] === "success" ? 1 : 0.3),
      healthBenchmarks: checkRunKeys.map(k => ecosystemBenchmarks[k] || 0),
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
        .filter(k => checkRuns[k] !== "success")
        .map(k => ({
          issue: formatLabel(k),
          recommendation: DIAGNOSTIC_ACTIONS[Object.keys(DIAGNOSTIC_ACTIONS).find(key => k.includes(key)) || "Default"] || "Analyze CI logs for specific failure root cause."
        })),
      surgicalPlan: [
        ...(migration.jenkinsVersion && (migration.jenkinsVersion.startsWith("1.") || (migration.jenkinsVersion.startsWith("2.") && parseFloat(migration.jenkinsVersion.split(".")[1]) < 440))
          ? [{ task: "Baseline Upgrade", action: DIAGNOSTIC_ACTIONS["Baseline"] }] : []),
        ...(migration.migrationStatus !== "SUCCESS"
          ? [{ task: "Recipe Remediation", action: "Review OpenRewrite 'modernizer' logs and resolve syntax conflicts." }] : []),
        ...(checkRunKeys.some(k => k.includes("Security")) && checkRuns[checkRunKeys.find(k => k.includes("Security"))!] !== "success"
          ? [{ task: "Security Hardening", action: DIAGNOSTIC_ACTIONS["Jenkins Security Scan"] }] : [])
      ]
    };
  }, [currentlySelectedPlugin, ecosystemBenchmarks, ecosystemRankingDist]);

  const renderCommandBar = () => (
    <div
      className="glass-card command-hub-card dynamic-island"
      ref={commandBarRef}
      style={{
        zIndex: 1100, /* V32: Boosted to ensure no overlap with plugin list */
        position: 'sticky', /* V32: Strategic Elevation */
        top: '20px'
      }}
    >
      <div className="command-pill-module">
        <p className="pill-micro-label">Search Plugins</p>
        <div className="nested-pill-input">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.5 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            placeholder="Search modernization registry..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            aria-label="Search modernization registry"
          />
        </div>
      </div>

      <div className="command-pill-module" style={{ flex: 1, minWidth: '150px' }}>
        <p className="pill-micro-label" style={{ paddingLeft: '0' }}>Risk Severity</p>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isSeverityOpen}
          aria-label="Filter by Risk Severity"
          onClick={() => { setIsSeverityOpen(!isSeverityOpen); setIsTopicOpen(false); setIsPROpen(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setIsSeverityOpen(false); }}
          className="tab-btn clickable"
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 16px',
            background: 'var(--input-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '16px',
            color: 'var(--text-primary)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="telemetry-icon-box" style={{ width: '28px', height: '28px', marginBottom: 0, color: 'var(--accent-red)', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="telemetry-value" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{severityFilter === 'ALL' ? 'All Risks' : formatLabel(severityFilter)}</span>
            </div>
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {isSeverityOpen && (
          <div
            role="listbox"
            aria-label="Risk Severity Options"
            className="opaque-dropdown reveal-node"
            style={{ position: 'absolute', top: 'calc(100% + 12px)', left: 0, borderRadius: '20px', padding: '8px' }}
          >
            {[
              { value: 'ALL', label: 'All Risks', color: 'var(--text-primary)' },
              { value: 'CRITICAL', label: 'Fail', color: 'var(--accent-red)' },
              { value: 'WARNING', label: 'Warning', color: 'var(--accent-amber)' },
              { value: 'OPTIMIZED', label: 'Success', color: 'var(--accent-neon)' }
            ].map(opt => (
              <div
                key={opt.value}
                role="option"
                aria-selected={severityFilter === opt.value}
                tabIndex={0}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setSeverityFilter(opt.value); 
                  setIsSeverityOpen(false); 
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSeverityFilter(opt.value);
                    setIsSeverityOpen(false);
                  } else if (e.key === 'Escape') {
                    setIsSeverityOpen(false);
                  }
                }}
                className={`cmd-dropdown-item ${severityFilter === opt.value ? 'active' : ''}`}
                style={{ color: opt.color, fontWeight: '900', cursor: 'pointer' }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color }}></div>
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>

    
      {/* 3. CATEGORY SELECTOR */}
      <div className="command-pill-module" style={{ flex: 1, minWidth: '150px' }}>
        <p className="pill-micro-label">Topic Vector</p>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isTopicOpen}
          aria-label="Filter by Topic Vector"
          onClick={() => { setIsTopicOpen(!isTopicOpen); setIsSeverityOpen(false); setIsPROpen(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setIsTopicOpen(false); }}
          className="tab-btn clickable"
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', color: 'var(--text-primary)' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="telemetry-icon-box" style={{ width: '28px', height: '28px', marginBottom: 0, color: 'var(--accent-secondary)', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="telemetry-value" style={{ fontSize: '12px' }}>{topicFilter === 'ALL' ? 'All Topics' : formatLabel(topicFilter)}</span>
            </div>
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {isTopicOpen && (
          <div
            role="listbox"
            aria-label="Topic Vector Options"
            className="opaque-dropdown reveal-node"
            style={{ position: 'absolute', top: 'calc(100% + 12px)', left: 0, maxHeight: '400px', overflowY: 'auto', borderRadius: '20px', padding: '8px' }}
          >
            <div
              role="option"
              aria-selected={topicFilter === 'ALL'}
              tabIndex={0}
              onClick={(e) => { 
                e.stopPropagation(); 
                setTopicFilter('ALL'); 
                setIsTopicOpen(false); 
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTopicFilter('ALL');
                  setIsTopicOpen(false);
                } else if (e.key === 'Escape') {
                  setIsTopicOpen(false);
                }
              }}
              className={`cmd-dropdown-item ${topicFilter === 'ALL' ? 'active' : ''}`}
              style={{ color: 'var(--text-primary)', fontWeight: '900', cursor: 'pointer' }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-primary)' }}></div>
              All Topics
            </div>
            {uniqueTopics.map(t => {
              const topicColor = getTopicColor(t);
              return (
                <div
                  key={t}
                  role="option"
                  aria-selected={topicFilter === t}
                  tabIndex={0}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setTopicFilter(t); 
                    setIsTopicOpen(false); 
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setTopicFilter(t);
                      setIsTopicOpen(false);
                    } else if (e.key === 'Escape') {
                      setIsTopicOpen(false);
                    }
                  }}
                  className={`cmd-dropdown-item ${topicFilter === t ? 'active' : ''}`}
                  style={{ color: topicColor, fontWeight: '900', cursor: 'pointer' }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: topicColor, flexShrink: 0 }}></div>
                  <span>{formatLabel(t)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    
      {/* 4. PRESENT ACTIVITY SELECTOR */}
      <div className="command-pill-module" style={{ flex: 1, minWidth: '150px' }}>
        <p className="pill-micro-label">Present Activity</p>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isPROpen}
          aria-label="Filter by Pull Request Activity"
          onClick={() => { setIsPROpen(!isPROpen); setIsSeverityOpen(false); setIsTopicOpen(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setIsPROpen(false); }}
          className="tab-btn clickable"
          style={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '6px 16px', 
            background: 'var(--input-bg)', 
            border: '1px solid var(--card-border)', 
            borderRadius: '16px', 
            color: 'var(--text-primary)' 
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="telemetry-icon-box" style={{ width: '28px', height: '28px', marginBottom: 0, color: 'var(--accent-secondary)', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" /></svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="telemetry-value" style={{ fontSize: '12px' }}>{prFilter === 'ALL' ? 'All Activity' : formatLabel(prFilter)}</span>
            </div>
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {isPROpen && (
          <div
            role="listbox"
            aria-label="Pull Request Activity Options"
            className="opaque-dropdown reveal-node"
            style={{ position: 'absolute', top: 'calc(100% + 12px)', left: 0, borderRadius: '20px', padding: '8px' }}
          >
            {[
              { value: 'ALL', label: 'All Activity', color: 'var(--text-primary)' },
              { value: 'MERGED', label: 'Merged', color: '#FF007F' },
              { value: 'OPEN', label: 'Open', color: '#00FFFF' },
              { value: 'CLOSED', label: 'Closed', color: 'var(--accent-red)' },
              { value: 'UNKNOWN', label: 'Unknown', color: '#FF5500' }
            ].map(opt => (
              <div
                key={opt.value}
                role="option"
                aria-selected={prFilter === opt.value}
                tabIndex={0}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setPrFilter(opt.value); 
                  setIsPROpen(false); 
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPrFilter(opt.value);
                    setIsPROpen(false);
                  } else if (e.key === 'Escape') {
                    setIsPROpen(false);
                  }
                }}
                className={`cmd-dropdown-item ${prFilter === opt.value ? 'active' : ''}`}
                style={{ color: opt.color, fontWeight: '900', cursor: 'pointer' }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color }}></div>
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="command-hub-right-group" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>


        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)', opacity: 0.6, letterSpacing: '1px' }}>ECOSYSTEM_COVERAGE</div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-neon)' }}>
              {Math.round((filteredEcosystem.length / allPluginsData.length) * 100)}%
            </div>
          </div>

          {/* Full Screen Switcher */}
          <button
            onClick={() => toggleFullscreen()}
            className={`tab-btn clickable ${isFullscreen ? 'active-fullscreen' : ''}`}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isFullscreen ? 'rgba(56, 209, 255, 0.2)' : 'rgba(var(--text-primary-rgb), 0.05)',
              border: isFullscreen ? '1px solid var(--accent-neon)' : '1px solid var(--card-border)',
              color: isFullscreen ? 'var(--accent-neon)' : 'var(--text-primary)',
              boxShadow: isFullscreen ? '0 0 16px rgba(130, 201, 30, 0.4)' : 'none',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: 'pointer'
            }}
            title={isFullscreen ? 'Exit Full Screen (Key: F)' : 'Open in Full Screen (Key: F)'}
            aria-label={isFullscreen ? 'Exit Full Screen' : 'Open in Full Screen'}
          >
            {isFullscreen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            )}
          </button>

          {/* Cinematic Theme Switcher (V40) */}
          <button
            onClick={toggleTheme}
            className="tab-btn clickable"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(var(--text-primary-rgb), 0.05)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-primary)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: 'pointer'
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            )}
          </button>
        </div>
      </div>
    </div>
);

  // ── ROUTING ENGINE (Persistent Multi-Panel Accessibility Architecture) ──
  const isPrimaryTab = ["Global Overview", "Data Explorer", "Strategic Workbench", "Methodology"].includes(currentlyActiveTab);

  const renderOverviewPanel = () => (
    <OverviewPanel
      currentlyActiveTab={currentlyActiveTab}
      workbenchMetrics={workbenchMetrics}
      heroCard1Ref={heroCard1Ref}
      heroCard2Ref={heroCard2Ref}
      heroCard3Ref={heroCard3Ref}
      chartRef={chartRef}
      hubCard1Ref={hubCard1Ref}
      hubCard2Ref={hubCard2Ref}
      hubCard3Ref={hubCard3Ref}
      hudRef={hudRef}
      topPieData={topPieData}
      integrityLabels={integrityLabels}
      integrityData={integrityData}
      integrityInsights={integrityInsights}
      overviewLabels={overviewLabels}
      overviewData={overviewData}
      baselineHealthSummary={baselineHealthSummary}
      grandTotalAdditions={grandTotalAdditions}
      grandTotalDeletions={grandTotalDeletions}
      grandTotalFilesChanged={grandTotalFilesChanged}
      highImpactTargets={highImpactTargets}
      activateLegacyView={activateLegacyView}
      activateRoadmap={activateRoadmap}
      activateBaselineBucket={activateBaselineBucket}
      handleDrillDown={handleDrillDown}
      formatLabel={formatLabel}
      theme={theme}
    />
  );

  const renderExplorerPanel = () => (
    <div
          id="panel-explorer"
          role="tabpanel"
          aria-labelledby="tab-explorer"
          tabIndex={0}
          className="tab-content animate-fade-up"
          key="explorer-tab-container"
          hidden={currentlyActiveTab !== "Data Explorer"}
          style={{ display: currentlyActiveTab === "Data Explorer" ? 'block' : 'none' }}
        >
          <ErrorBoundary>
            <DataExplorer
              plugins={filteredEcosystem}
              onPluginSelect={handleDrillDown}
              externalSearch={globalSearch}
              externalMigrationFilter={severityFilter}
              externalPrFilter={prFilter}
              externalBaselineFilter={baselineFilter}
              onClearBaselineFilter={() => setBaselineFilter('ALL')}
              roadmapList={workbenchMetrics.roadmapList}
              legacyAlignmentList={workbenchMetrics.legacyAlignmentNames}
              onClearExternal={() => setGlobalSearch("")}
            />
          </ErrorBoundary>
        </div>
  );

  const renderWorkbenchPanel = () => (
    <WorkbenchPanel
      isVisible={currentlyActiveTab === "Strategic Workbench"}
      activeQueueFilter={activeQueueFilter}
      setActiveQueueFilter={setActiveQueueFilter}
      workbenchMetrics={workbenchMetrics}
      allPluginsWithInsights={allPluginsWithInsights}
      workbenchPage={workbenchPage}
      setWorkbenchPage={setWorkbenchPage}
      itemsPerPage={itemsPerPage}
      onPluginSelect={handleDrillDown}
      onReturnToOverview={() => setCurrentlyActiveTab("Global Overview")}
    />
  );

  const renderMethodologyPanel = () => (
    <MethodologyPanel isVisible={currentlyActiveTab === "Methodology"} />
  );

  const renderPluginDetailPanel = () => (
    <PluginDetailPanel
      currentlySelectedPlugin={currentlySelectedPlugin}
      detailMetrics={detailMetrics}
      currentlyActiveTab={currentlyActiveTab}
      surgeryQueue={surgeryQueue}
      toggleQueueItem={toggleQueueItem}
      setCurrentlyActiveTab={setCurrentlyActiveTab}
      formatLabel={formatLabel}
    />
  );

  const renderMainContent = () => (
    <>
      {renderOverviewPanel()}
      {renderExplorerPanel()}
      {renderWorkbenchPanel()}
      {renderMethodologyPanel()}
      {!isPrimaryTab && renderPluginDetailPanel()}
    </>
  );

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
              src={jenkinsLogo}
              alt="Jenkins Logo"
              className="w-24 sm:w-28 md:w-32 h-auto drop-shadow-[0_0_24px_rgba(255,255,255,0.3)] transition-transform duration-500 hover:scale-105"
            />
          </div>

          {/* Text Content */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left pt-2 md:pt-4">
            <h1 className="title font-black leading-[1.1] tracking-tight mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-[64px]" style={{ color: 'var(--text-primary)' }}>
              Jenkins Plugin <br className="hidden md:block" />
              <span className="plugin-name" style={{ backgroundImage: 'linear-gradient(45deg, var(--accent-primary), var(--accent-neon))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>Modernization Insight</span>
            </h1>

            <div className="flex flex-col gap-3 relative border-t md:border-t-0 md:border-l-[3px] border-white/20 pt-5 md:pt-0 md:pl-6 max-w-3xl">
              <div className="absolute top-0 left-[-3px] w-[3px] h-0 md:h-full bg-gradient-to-b from-[var(--accent-primary)] to-[var(--accent-neon)] hidden md:block"></div>

              <p className="text-lg sm:text-xl md:text-[22px] font-medium leading-relaxed tracking-wide m-0 drop-shadow-md" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>
                A static analytics dashboard for visualizing Jenkins plugin modernization status and ecosystem health.
              </p>

              <p className="text-[color:var(--accent-secondary)] text-xs sm:text-sm md:text-[13px] font-mono uppercase tracking-[0.2em] font-bold mt-1 opacity-90">
                Turning modernization data into an actionable insight for the Jenkins maintainer
              </p>
            </div>
          </div>

        </div>
      </div>

      <DashboardTabs activeTab={currentlyActiveTab} onSelectTab={setCurrentlyActiveTab} />

      {/* 🛠 GLOBAL COMMAND HUB (V15) */}
      {(currentlyActiveTab === "Global Overview" || currentlyActiveTab === "Strategic Workbench" || currentlyActiveTab === "Data Explorer") && renderCommandBar()}

      <main id="main-content">
        {renderMainContent()}
      </main>

      <SurgeryTray
        queue={surgeryQueue}
        allPluginsWithInsights={allPluginsWithInsights}
        onClearQueue={() => setSurgeryQueue([])}
        onInspectPlugin={handleDrillDown}
        onRemovePlugin={toggleQueueItem}
      />

      {/* 🖥️ FULL SCREEN FLOATING INDICATOR */}
      {isFullscreen && (
        <div className="fullscreen-indicator-toast">
          <span className="pulse-dot warning"></span>
          <span>FULL SCREEN ACTIVE</span>
          <button
            onClick={() => toggleFullscreen()}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginLeft: '6px'
            }}
            aria-label="Exit full screen"
          >
            EXIT [F]
          </button>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
