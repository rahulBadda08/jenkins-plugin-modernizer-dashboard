import "./Dashboard.css";
import BarChart from "./components/BarChart";
import PieChart from "./components/PieChart";
import DataExplorer from "./components/DataExplorer";
import allPluginsRaw from "./data/all_plugins.json";
import React, { useState, useMemo, useEffect, useRef } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

// --- ASSETS ---
import architectureImage from "./assets/architecture_diagram.png";
import automationStackImage from "./assets/automation_stack_blueprint.png";
import dataAcquisitionImage from "./assets/data_acquisition_blueprint.png";
import visualizationLayerImage from "./assets/visualization_layer_blueprint.png";

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
const MarqueeHeader: React.FC<{ text: string; style?: React.CSSProperties }> = ({ text, style }) => {
  const items = Array(10).fill(`${text} - SYSTEM INTEGRITY`);
  return (
    <div className="marquee-wrapper reveal-node" style={style}>
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

// ── V49: THE SURGICAL DIRECTIVE ENGINE ──
const LTS_BASELINE = "2.452.3";
const OUTDATED_MINOR_THRESHOLD = 440;

const calculateDrift = (current: string): { gap: number; criticality: 'low' | 'med' | 'critical' } => {
  const parse = (v: string) => v.split('.').map(p => parseInt(p) || 0);
  const currentParts = parse(current || "0.0");
  const baselineParts = parse(LTS_BASELINE);

  // High-level heuristic for version distance (Focusing on the minor part primarily for Jenkins 2.x)
  const gap = Math.abs((baselineParts[0] * 1000 + baselineParts[1]) - (currentParts[0] * 1000 + currentParts[1]));

  return {
    gap,
    criticality: gap > 50 ? 'critical' : (gap > 20 ? 'med' : 'low')
  };
};

const getRemediationCommands = (checklist: any[], pluginName: string): string[] => {
  const commands: string[] = [];
  const fails = checklist.filter(c => !c.value);

  if (fails.some(f => f.label.includes('BOM'))) {
    commands.push(`mvn jenkins-plugin-modernizer:modernize -Drecipe=BomAlignment`);
  }
  if (fails.some(f => f.label.includes('Parent'))) {
    commands.push(`mvn versions:update-parent -DparentVersion=5.12`);
  }
  if (fails.some(f => f.label.includes('CI'))) {
    commands.push(`gh workflow run modernization.yml --repo jenkins-plugins/${pluginName}`);
  }
  if (fails.some(f => f.label.includes('API'))) {
    commands.push(`mvn rewrite:run -DactiveRecipes=org.openrewrite.jenkins.ModernizePlugin`);
  }

  if (commands.length === 0) commands.push("# No immediate technical remediation required. Baseline aligned.");
  return commands;
};

// ── V45: STRATEGIC ASSESSMENT ENGINE (CENTRALIZED) ──
interface PluginInsight {
  actionInsight: {
    status: string;
    severity: 'danger' | 'warning' | 'success';
    summary: string[];
    recommendations: string[];
  };
  priorities: {
    severity: { label: string; status: string; color: string };
    maintenance: { label: string; status: string; color: string };
    security: { label: string; status: string; color: string };
  };
  checklist: Array<{ label: string; value: boolean; description: string }>;
  issueBreakdown: {
    deprecated: { label: string; value: boolean; display: string };
    ci: { label: string; value: boolean; display: string };
    pr: { label: string; value: boolean; display: string };
  };
  surgical: {
    drift: { gap: number; criticality: string };
    commands: string[];
    difficulty: number;
  };
}

const getPluginInsight = (plugin: PluginData): PluginInsight => {
  const migration = plugin.migrations?.[0] || {} as Migration;
  const checkRuns = migration.checkRuns || {};
  const checkRunKeys = Object.keys(checkRuns);
  const status = (migration.migrationStatus || "").toLowerCase();
  const ver = migration.jenkinsVersion || "0.0";
  const prStatus = (migration.pullRequestStatus || "unknown").toLowerCase();

  const isOutdated = ver.startsWith("1.") || (ver.startsWith("2.") && parseFloat(ver.split(".")[1]) < OUTDATED_MINOR_THRESHOLD);
  const hasSecurityRisk = checkRunKeys.some(k => k.toLowerCase().includes("security")) &&
    checkRuns[checkRunKeys.find(k => k.toLowerCase().includes("security"))!] !== "success";
  const hasCiFailure = migration.checkRunsSummary !== "success";
  const hasNoPR = prStatus === "unknown" || prStatus === "none" || prStatus === "";

  // ── V46: MODERNIZATION CHECKLIST LOGIC ──
  const checklist = [
    {
      label: "BOM Aligned",
      value: checkRuns['BOM'] === 'success' || checkRuns['Bom'] === 'success',
      description: "Bill of Materials dependency management"
    },
    {
      label: "Latest Parent POM",
      value: checkRuns['Parent Pom'] === 'success',
      description: "Modern Jenkins build configuration"
    },
    {
      label: "CI Configured",
      value: migration.checkRunsSummary === 'success',
      description: "Automated verification & passing tests"
    },
    {
      label: "Active Maintenance",
      value: !hasNoPR,
      description: "Ongoing pull request and refactor activity"
    },
    {
      label: "Modern APIs",
      value: checkRuns['Modernizer'] === 'success',
      description: "Verification of non-deprecated API usage"
    }
  ];

  const issueBreakdown = {
    deprecated: {
      label: "Deprecated",
      value: (migration.tags || []).some(t => t.toLowerCase() === 'deprecated'),
      display: (migration.tags || []).some(t => t.toLowerCase() === 'deprecated') ? "YES" : "NO"
    },
    ci: {
      label: "CI Integrity",
      value: migration.checkRunsSummary === 'success',
      display: migration.checkRunsSummary === 'success' ? "CONFIGURED" : "MISSING"
    },
    pr: {
      label: "Maintenance",
      value: !hasNoPR,
      display: !hasNoPR ? "ACTIVE" : "NONE"
    }
  };

  let actionInsight: PluginInsight['actionInsight'] = {
    status: "STABLE & ELIGIBLE",
    severity: "success",
    summary: [
      "Modernization Automated → Code base is aligned with current Jenkins standards",
      "Clear Maintenance Path → Integrated into modernization CI"
    ],
    recommendations: ["Monitor for new modernization recipes", "Ecosystem baseline is healthy"]
  };

  if (status === "fail" || status === "failure" || hasSecurityRisk) {
    actionInsight = {
      status: "HIGH RISK / CRITICAL",
      severity: "danger",
      summary: [
        status.includes("fail") ? "Modernization Stalled → Automated tools unable to reconcile code base" : "🚨 Security Integrity Breach → Critical remediation required",
        hasCiFailure ? "Pipeline Regressions → Core stability checks are failing" : "⚠️ Baseline Misalignment → System integrity at risk"
      ],
      recommendations: [
        "Manual intervention required: Review 'modernizer' logs",
        "Analyze security findings in repository",
        "Consider repository adoption or replacement"
      ]
    };
  } else if (isOutdated || status === "aborted" || hasNoPR) {
    const narratives = [];
    if (hasNoPR) narratives.push("No active pull requests → No ongoing maintenance detected");
    if (isOutdated) narratives.push(`Architecturally Obsolete → Version ${ver} is below Ecosystem 2026 baseline`);
    if (status === "aborted") narratives.push("Build Terminated → Modernization attempt was manually interrupted");
    if (narratives.length === 0) narratives.push("Moderate risk identified in plugin telemetry");

    actionInsight = {
      status: "LEGACY / AT RISK",
      severity: "warning",
      summary: narratives,
      recommendations: [
        "Adopt and modernize repository",
        "Upgrade Jenkins baseline to >= 2.440.3",
        "Establish active PR workflow to resume maintenance"
      ]
    };
  }

  const priorities = {
    severity: {
      label: "Severity",
      status: (status === "fail" || status === "failure" || hasSecurityRisk) ? "Critical" : (isOutdated ? "Warning" : "Low"),
      color: (status === "fail" || status === "failure" || hasSecurityRisk) ? "var(--accent-red)" : (isOutdated ? "var(--accent-amber)" : "var(--accent-neon)")
    },
    maintenance: {
      label: "Maintenance",
      status: hasNoPR ? "Inactive" : (status.includes("fail") ? "Stalled" : "Active"),
      color: hasNoPR ? "var(--accent-amber)" : (status.includes("fail") ? "var(--accent-red)" : "var(--accent-neon)")
    },
    security: {
      label: "Security",
      status: hasSecurityRisk ? "Active Advisory" : "No active advisory",
      color: hasSecurityRisk ? "var(--accent-red)" : "var(--accent-neon)"
    }
  };

  const drift = calculateDrift(ver);
  const commands = getRemediationCommands(checklist, plugin.pluginName);

  // V49: Complexity Heuristic
  const failCount = checklist.filter(c => !c.value).length;
  const intensityFactor = ((migration.additions || 0) + (migration.deletions || 0)) > 1000 ? 2 : 0;
  const driftFactor = drift.gap > 50 ? 3 : (drift.gap > 20 ? 1 : 0);
  const difficulty = Math.min(10, 1 + failCount + intensityFactor + driftFactor);

  return { actionInsight, priorities, checklist, issueBreakdown, surgical: { drift, commands, difficulty } };
};

// ── V48: GLOBAL RANKING ENGINE ──
const calculateHealthScore = (plugin: PluginData): number => {
  let score = 100;
  const migration = plugin.migrations?.[0] || {} as Migration;
  const checkRuns = migration.checkRuns || {};
  const ver = migration.jenkinsVersion || "0.0";
  const prStatus = (migration.pullRequestStatus || "unknown").toLowerCase();

  if (migration.checkRunsSummary !== "success") score -= 25;
  if ((migration.tags || []).some(t => t.toLowerCase() === 'deprecated')) score -= 20;
  if (checkRuns['BOM'] !== 'success' && checkRuns['Bom'] !== 'success') score -= 15;
  if (prStatus === "unknown" || prStatus === "none" || prStatus === "") score -= 15;
  if (Object.keys(checkRuns).some(k => k.toLowerCase().includes("security") && checkRuns[k] !== "success")) score -= 15;
  if (ver.startsWith("1.") || (ver.startsWith("2.") && parseFloat(ver.split(".")[1]) < OUTDATED_MINOR_THRESHOLD)) score -= 10;

  return Math.max(0, score);
};

function Dashboard() {
  const allPluginsData = allPluginsRaw as unknown as PluginData[];

  // ── V45: PRE-CALCULATE ALL INSIGHTS ──
  const allPluginsWithInsights = useMemo(() => {
    return allPluginsData.map(plugin => ({
      ...plugin,
      insight: getPluginInsight(plugin),
      healthScore: calculateHealthScore(plugin)
    }));
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

  const [currentlyActiveTab, setCurrentlyActiveTab] = useState<string>("Global Overview");

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


  // ── HOOK: CINEMATIC SCROLL TRACKER (V21) ──
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── HOOK: KINETIC MOUSE TRACKER (V42: LERP REFACTOR) ──
  const targetX = useRef(window.innerWidth / 2);
  const targetY = useRef(window.innerHeight / 2);
  const currentX = useRef(window.innerWidth / 2);
  const currentY = useRef(window.innerHeight / 2);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetX.current = e.clientX;
      targetY.current = e.clientY;
    };

    let rafId: number;
    const animate = () => {
      // LERP: current = current + (target - current) * factor
      // 0.08 provides an oily, fluid lag that feels high-end
      currentX.current += (targetX.current - currentX.current) * 0.08;
      currentY.current += (targetY.current - currentY.current) * 0.08;

      document.documentElement.style.setProperty('--mouse-x', `${currentX.current}px`);
      document.documentElement.style.setProperty('--mouse-y', `${currentY.current}px`);

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
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
    allPluginsWithInsights.filter(plugin => plugin.migrations && plugin.migrations.length > 0),
    [allPluginsWithInsights]
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
        const isOutdated = ver.startsWith("1.") || (ver.startsWith("2.") && parseFloat(ver.split(".")[1]) < OUTDATED_MINOR_THRESHOLD);

        if (severityFilter === "CRITICAL") matchesSeverity = mStatus === "fail" || mStatus === "failure";
        else if (severityFilter === "WARNING") matchesSeverity = isOutdated || mStatus === "aborted";
        else if (severityFilter === "OPTIMIZED") matchesSeverity = mStatus === "success";
      }

      return matchesTopic && matchesPR && matchesSeverity;
    });

    const outdatedPlugins = baseList.filter(p => {
      const ver = p.migrations[0].jenkinsVersion || "0.0";
      return ver.startsWith("1.") || (ver.startsWith("2.") && parseFloat(ver.split(".")[1]) < OUTDATED_MINOR_THRESHOLD);
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
      const isOutdated = ver.startsWith("1.") || (ver.startsWith("2.") && parseFloat(ver.split(".")[1]) < OUTDATED_MINOR_THRESHOLD);

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
      const migration = p.migrations?.[0];
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
        const failFactor = p.insight.checklist.filter(c => !c.value).length * 10;
        const totalImpact = (driftFactor + failFactor) * (1 + (p.migrations[0].additions + p.migrations[0].deletions) / 5000);
        return { ...p, impactScore: totalImpact };
      })
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5);
  }, [allPluginsWithInsights]);

  const grandTotalAdditions = useMemo(() =>
    filteredEcosystem.reduce((acc, plugin) => acc + (plugin.migrations[0].additions || 0), 0)
    , [filteredEcosystem]);

  const grandTotalDeletions = useMemo(() =>
    filteredEcosystem.reduce((acc, plugin) => acc + (plugin.migrations[0].deletions || 0), 0)
    , [filteredEcosystem]);

  const grandTotalFilesChanged = useMemo(() =>
    filteredEcosystem.reduce((acc, plugin) => acc + (plugin.migrations[0].changedFiles || 0), 0)
    , [filteredEcosystem]);

  const { topPieData, overviewLabels, overviewData, integrityLabels, integrityData, integrityInsights } = useMemo(() => {
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
      healthData: checkRunKeys.map(k => migration.checkRuns[k] === "success" ? 1 : 0.3),
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
          />
        </div>
      </div>

      <div className="command-pill-module" style={{ flex: 1, minWidth: '150px' }}>
        <p className="pill-micro-label" style={{ paddingLeft: '0' }}>Risk Severity</p>
        <button
          onClick={() => { setIsSeverityOpen(!isSeverityOpen); setIsTopicOpen(false); setIsPROpen(false); }}
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
          <div className="opaque-dropdown reveal-node" style={{ position: 'absolute', top: 'calc(100% + 12px)', left: 0, borderRadius: '20px', padding: '8px' }}>
            {[
              { value: 'ALL', label: 'All Risks', color: 'var(--text-primary)' },
              { value: 'CRITICAL', label: 'Fail', color: 'var(--accent-red)' },
              { value: 'WARNING', label: 'Warning', color: 'var(--accent-amber)' },
              { value: 'OPTIMIZED', label: 'Success', color: 'var(--accent-neon)' }
            ].map(opt => (
              <div
                key={opt.value}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setSeverityFilter(opt.value); 
                  setIsSeverityOpen(false); 
                }}
                className={`cmd-dropdown-item ${severityFilter === opt.value ? 'active' : ''}`}
                style={{ color: opt.color, fontWeight: '900' }}
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
          onClick={() => { setIsTopicOpen(!isTopicOpen); setIsSeverityOpen(false); setIsPROpen(false); }}
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
          <div className="opaque-dropdown reveal-node" style={{ position: 'absolute', top: 'calc(100% + 12px)', left: 0, maxHeight: '400px', overflowY: 'auto', borderRadius: '20px', padding: '8px' }}>
            <div
              onClick={(e) => { 
                e.stopPropagation(); 
                setTopicFilter('ALL'); 
                setIsTopicOpen(false); 
              }}
              className={`cmd-dropdown-item ${topicFilter === 'ALL' ? 'active' : ''}`}
              style={{ color: 'var(--text-primary)', fontWeight: '900' }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-primary)' }}></div>
              All Topics
            </div>
            {uniqueTopics.map(t => {
              const topicColor = getTopicColor(t);
              return (
                <div
                  key={t}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setTopicFilter(t); 
                    setIsTopicOpen(false); 
                  }}
                  className={`cmd-dropdown-item ${topicFilter === t ? 'active' : ''}`}
                  style={{ color: topicColor, fontWeight: '900' }}
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
          onClick={() => { setIsPROpen(!isPROpen); setIsSeverityOpen(false); setIsTopicOpen(false); }}
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
          <div className="opaque-dropdown reveal-node" style={{ position: 'absolute', top: 'calc(100% + 12px)', left: 0, borderRadius: '20px', padding: '8px' }}>
            {[
              { value: 'ALL', label: 'All Activity', color: 'var(--text-primary)' },
              { value: 'MERGED', label: 'Merged', color: '#FF007F' },
              { value: 'OPEN', label: 'Open', color: '#00FFFF' },
              { value: 'CLOSED', label: 'Closed', color: 'var(--accent-red)' },
              { value: 'UNKNOWN', label: 'Unknown', color: '#FF5500' }
            ].map(opt => (
              <div
                key={opt.value}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setPrFilter(opt.value); 
                  setIsPROpen(false); 
                }}
                className={`cmd-dropdown-item ${prFilter === opt.value ? 'active' : ''}`}
                style={{ color: opt.color, fontWeight: '900' }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color }}></div>
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="command-hub-right-group" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>


        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)', opacity: 0.6, letterSpacing: '1px' }}>ECOSYSTEM_COVERAGE</div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-neon)' }}>
              {Math.round((filteredEcosystem.length / allPluginsData.length) * 100)}%
            </div>
          </div>

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
              cursor: 'none'
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
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

  // ── ROUTING ENGINE ──
  const renderMainContent = () => {
    if (currentlyActiveTab === "Global Overview") {
      return (
        <div className="tab-content" key="global" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          

          <MarqueeHeader text="ECOSYSTEM HEALTH REPORT" />
          <div className="executive-hero-grid" style={{ perspective: '1200px' }}>
            <div ref={heroCard1Ref} className="glass-card hero-card info kinetic-card liquid-glass tier-1 in-view">
              <div className="kinetic-text">
                <span className="hero-label truncate-text">Indexed Plugins</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="hero-value mono">{workbenchMetrics.filteredCount}</span>
                  <span className="mono" style={{ fontSize: '10px', opacity: 0.4 }}>[TOTAL]</span>
                </div>
                <p className="hero-desc">Total plugins currently tracked in the modernization registry.</p>
              </div>
            </div>

            <div ref={heroCard2Ref} className="glass-card hero-card risk-glow kinetic-card liquid-glass tier-2 in-view" onClick={activateLegacyView} style={{ cursor: 'pointer' }}>
              <div className="kinetic-text">
                <span className="hero-label truncate-text">Modern Alignment Gap</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="hero-value mono">{workbenchMetrics.legacyAlignmentPercentage}%</span>
                  <span className="mono" style={{ fontSize: '10px', opacity: 0.4 }}>[LEGACY_CORE]</span>
                </div>
                <p className="hero-desc">Percentage of plugins requiring baseline upgrades ( &gt; 2.440).</p>
              </div>
            </div>

            <div ref={heroCard3Ref} className="glass-card hero-card success-glow kinetic-card liquid-glass tier-3 in-view">
              <div className="kinetic-text">
                <span className="hero-label">Modernization Success</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="hero-value mono">{workbenchMetrics.modernizedPercentage}%</span>
                  <span className="mono" style={{ fontSize: '10px', opacity: 0.4 }}>[ALIGNED]</span>
                </div>
                <p className="hero-desc">Percentage of the ecosystem meeting modern development standards.</p>
              </div>
            </div>
          </div>


        
          <div ref={chartRef} className="charts-grid reveal-node animate-delay-4" style={{ marginTop: '0px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
            <div className="glass-card chart-card">
              <PieChart
                data={topPieData}
                title="Sector Distribution"
                theme={theme}
              />
            </div>
            <div className="glass-card chart-card">
              <BarChart
                labels={integrityLabels}
                data={integrityData}
                insights={integrityInsights}
                colors={new Array(integrityData.length).fill('#10B981')}
                title="Global Integrity Index"
                theme={theme}
                yMax={1}
              />
            </div>
          </div>

          <div className="charts-grid reveal-node animate-delay-5" style={{ marginTop: '30px' }}>
            <div className="glass-card chart-card chart-full">
              <BarChart
                labels={overviewLabels}
                data={overviewData}
                colors={new Array(overviewData.length).fill('#F59E0B')}
                title="Modernization Intensity"
                theme={theme}
                rotateLabel={45}
                onItemClick={handleDrillDown}
              />
            </div>
          </div>

        
          <div className="strategic-hub reveal-node" style={{ '--delay': '500ms' } as React.CSSProperties}>
            <div className="hub-briefing">
              <div className="system-status-badge">
                <span className="pulse-dot warning"></span> Project Roadmap Active
              </div>
              <h2 className="hub-title">Command Center <span className="mono text-accent">Briefing</span></h2>
              <p className="hub-subtitle">Tactical diagnostics identified for human intervention.</p>
            </div>

            <div className="hub-grid">
              <div ref={hubCard1Ref} className="glass-card hub-card risk clickable kinetic-card liquid-glass animate-delay-1" onClick={activateLegacyView}>
                <div className="kinetic-text">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="hub-card-label">Legacy Core Alignment</span>
                    <span className="hub-card-val mono">{workbenchMetrics.legacyAlignmentPercentage}%</span>
                  </div>
                  <p className="hub-card-desc">Entities requiring modernization to meet Core standards.</p>
                  <div className="hub-card-action">Inspect Legacy Plugins →</div>
                </div>
              </div>

              <div ref={hubCard2Ref} className="glass-card hub-card risk kinetic-card liquid-glass animate-delay-2">
                <div className="kinetic-text">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="hub-card-label">Primary Risk Vector</span>
                    <span className="hub-card-val mono" style={{ fontSize: '14px' }}>{formatLabel(workbenchMetrics.mainRiskArea)}</span>
                  </div>
                  <p className="hub-card-desc">Most frequent failure point.</p>
                  <div className="hub-card-action secondary">Diagnostic Locked</div>
                </div>
              </div>

              <div ref={hubCard3Ref} className="glass-card hub-card roadmap clickable kinetic-card liquid-glass animate-delay-3" onClick={activateRoadmap}>
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



          
          <div ref={hudRef} className="mutation-hud animate-delay-5 in-view">

            {/* 1. CODE CHURN & IMPACT */}
            <div className="glass-card hud-module liquid-glass">
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
                  <svg className="radial-progress-svg" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#c084fc" />
                      </linearGradient>
                    </defs>
                    <circle className="radial-bg" cx="50" cy="50" r="45"></circle>
                    <circle
                      className="radial-active"
                      cx="50" cy="50" r="45"
                      stroke="url(#healthGradient)"
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
            <div className="glass-card hud-module liquid-glass">
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

          
          <div className="reveal-node animate-delay-5" style={{ marginTop: '32px' }}>
            <div className="hub-briefing" style={{ marginBottom: '24px' }}>
              <div className="system-status-badge">
                <span className="pulse-dot danger"></span> Immediate Action Required
              </div>
              <h2 className="hub-title" style={{ fontSize: '24px' }}>High Impact <span className="mono text-accent">Targets</span></h2>
              <p className="hub-subtitle">Top 5 entities identified with maximum modernization ROI.</p>
            </div>
            
            <div className="task-grid">
              {highImpactTargets.map((target, idx) => (
                <div 
                  key={target.pluginName} 
                  className="glass-card tactical-task-card kinetic-card in-view" 
                  onClick={() => handleDrillDown(target.pluginName)} 
                  style={{ cursor: 'pointer', '--delay': `${idx * 100}ms` } as React.CSSProperties}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="mono" style={{ opacity: 0.3, fontSize: '20px' }}>0{idx + 1}</div>
                    <div>
                      <span className="task-plugin-name" style={{ fontSize: '16px' }}>{target.pluginName}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span className="hero-desc" style={{ fontSize: '11px', color: 'var(--accent-secondary)' }}>Impact Score: {target.impactScore.toFixed(0)}</span>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}></div>
                        <span className="hero-desc" style={{ fontSize: '11px' }}>{target.insight.surgical.drift.gap} Drift</span>
                      </div>
                    </div>
                  </div>
                  <div className="task-badge success" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>HIGH ROI</div>
                </div>
              ))}
            </div>
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
                <span className="plugin-name truncate-text" style={{ maxWidth: '100%', margin: '0 auto' }}>{currentlySelectedPlugin.pluginName}</span>
              </h2>
            </div>

            <div className="a-button-group" style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => toggleQueueItem(currentlySelectedPlugin.pluginName)}
                className={`tab-btn ${surgeryQueue.includes(currentlySelectedPlugin.pluginName) ? 'active' : ''}`}
                style={{ fontSize: '11px' }}
              >
                {surgeryQueue.includes(currentlySelectedPlugin.pluginName) ? '✓ IN SURGERY QUEUE' : '+ ADD TO QUEUE'}
              </button>
            </div>
          </div>

          {/* ── V43: STRATEGIC ACTION PANEL (NARRATIVE COMMAND CENTER) ── */}
          <div className={`action-panel ${detailMetrics.actionInsight.severity} reveal-node`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="action-status-badge">
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 12px currentColor' }}></div>
                  {detailMetrics.actionInsight.status}
                </div>
                <h3 className="action-header">Strategic Assessment</h3>
              </div>

              {/* V43: Risk Indicator Meter */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div className={`drift-badge ${detailMetrics.surgical.drift.criticality}`}>
                  {detailMetrics.surgical.drift.gap} VERSION_DRIFT
                </div>
                {detailMetrics.actionInsight.severity === 'danger' && (
                  <div className="telemetry-module danger" style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px' }}>
                    <span className="mono" style={{ fontSize: '10px', color: '#EF4444', fontWeight: 800 }}>CRITICAL_BLOCKER_DETECTED</span>
                  </div>
                )}
              </div>
            </div>

            {/* V44: Strategic Priority HUD */}
            <div className="priority-hud">
              {Object.entries(detailMetrics.priorities).map(([key, p]) => (
                <div key={key} className="priority-badge">
                  <div
                    className="priority-indicator"
                    style={{
                      background: p.color,
                      boxShadow: `0 0 10px ${p.color}, 0 0 5px ${p.color}`
                    }}
                  ></div>
                  <span className="priority-label">{p.label}:</span>
                  <span className="priority-status" style={{ color: p.color }}>{p.status}</span>
                </div>
              ))}
            </div>

            {/* V47: BRUTAL TRUTH ISSUE BREAKDOWN HUD */}
            <div className="issue-breakdown-hud">
              <div className={`issue-card ${detailMetrics.issueBreakdown.deprecated.value ? 'danger' : 'success'}`}>
                <div className="issue-label">{detailMetrics.issueBreakdown.deprecated.label}</div>
                <div className="issue-value">
                  {detailMetrics.issueBreakdown.deprecated.value ? (
                    <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> YES</>
                  ) : (
                    <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg> NO</>
                  )}
                </div>
              </div>
              <div className={`issue-card ${detailMetrics.issueBreakdown.ci.value ? 'success' : 'danger'}`}>
                <div className="issue-label">{detailMetrics.issueBreakdown.ci.label}</div>
                <div className="issue-value">
                  {!detailMetrics.issueBreakdown.ci.value ? (
                    <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> MISSING</>
                  ) : (
                    <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg> CONFIGURED</>
                  )}
                </div>
              </div>
              <div className={`issue-card ${detailMetrics.issueBreakdown.pr.value ? 'success' : 'danger'}`}>
                <div className="issue-label">{detailMetrics.issueBreakdown.pr.label}</div>
                <div className="issue-value">
                  {!detailMetrics.issueBreakdown.pr.value ? (
                    <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> NONE</>
                  ) : (
                    <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg> ACTIVE</>
                  )}
                </div>
              </div>
              <div className={`issue-card ${detailMetrics.ranking.severity}`}>
                <div className="issue-label">Ecosystem Rank</div>
                <div className="issue-value" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                  {detailMetrics.ranking.label}
                </div>
              </div>
            </div>

            {/* V46: Modernization Checklist HUD */}
            <div className="modernization-checklist">
              <div className="checklist-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                MODERNIZATION_CHECKLIST - ECOSYSTEM_ALIGNMENT
              </div>
              <div className="checklist-grid">
                {detailMetrics.checklist.map((item, idx) => (
                  <div key={idx} className={`checklist-item ${item.value ? 'success' : 'failure'}`}>
                    <div className="item-main">
                      <div className="status-marker">
                        {item.value ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        )}
                      </div>
                      <div className="item-info">
                        <span className="item-label">{item.label}</span>
                        <span className="item-desc">{item.description}</span>
                      </div>
                    </div>
                    <div className="item-state">{item.value ? 'ALIGNED' : 'MISSING'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="surgical-terminal">
              <div className="terminal-header">
                <div className="terminal-title">SURGICAL_INTERVENTION_TERMINAL - REMEDIATION_SCRIPTS</div>
                <div className="complexity-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="mono" style={{ fontSize: '9px', opacity: 0.5 }}>COMPLEXITY: {detailMetrics.surgical.difficulty}/10</span>
                  <div className="complexity-meter" style={{ width: '80px', marginTop: 0 }}>
                    <div
                      className={`complexity-bar ${detailMetrics.surgical.difficulty > 7 ? 'high' : (detailMetrics.surgical.difficulty > 3 ? 'med' : 'low')}`}
                      style={{ width: `${detailMetrics.surgical.difficulty * 10}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="terminal-content">
                {detailMetrics.surgical.commands.map((cmd, idx) => (
                  <div key={idx} className={`terminal-line ${cmd.startsWith('#') ? '' : 'cmd'}`}>
                    {cmd}
                  </div>
                ))}
              </div>
            </div>

            {/* 🥉 V50: CONTRIBUTION DIRECTIVE (GUIDED ACTION) */}
            <div className="contribution-hub reveal-node animate-delay-2" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                <div>
                  <h4 className="mono" style={{ color: 'var(--accent-neon)', fontSize: '12px', letterSpacing: '2px', marginBottom: '8px' }}>CONTRIBUTION // DIRECTIVES</h4>
                  <h3 className="title" style={{ fontSize: '24px' }}>Execute Modernization</h3>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }} className="mono">GUIDED_REMEDIATION_PATHWAY</div>
              </div>

              <div className="action-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                <a href={currentlySelectedPlugin.pluginRepository} target="_blank" rel="noreferrer" className="glass-card kinetic-card in-view" style={{ padding: '20px', textDecoration: 'none' }}>
                  <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)', marginBottom: '8px' }}>[STEP_01]</div>
                  <h5 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>Analyze Codebase</h5>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Inspect source files and technical debt in the primary repository.</p>
                  <div className="link-btn" style={{ fontWeight: 800, fontSize: '11px' }}>Visit GitHub Repository →</div>
                </a>

                <a href={`${currentlySelectedPlugin.pluginRepository}/issues`} target="_blank" rel="noreferrer" className="glass-card kinetic-card in-view" style={{ padding: '20px', textDecoration: 'none' }}>
                  <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)', marginBottom: '8px' }}>[STEP_02]</div>
                  <h5 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>Survey Issues</h5>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Check for existing modernization blockers or security advisories.</p>
                  <div className="link-btn" style={{ fontWeight: 800, fontSize: '11px' }}>View Open Issues →</div>
                </a>

                <a href={`${currentlySelectedPlugin.pluginRepository}/compare`} target="_blank" rel="noreferrer" className="glass-card kinetic-card in-view" style={{ padding: '20px', textDecoration: 'none', borderLeft: '3px solid var(--accent-neon)' }}>
                  <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-neon)', marginBottom: '8px' }}>[STEP_03]</div>
                  <h5 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>Initiate Surgery</h5>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Create a modernization pull request based on terminal insights.</p>
                  <div className="link-btn" style={{ color: 'var(--accent-neon)', fontWeight: 800, fontSize: '11px' }}>Create Modernization PR →</div>
                </a>
              </div>
            </div>

            
            <div className="action-grid" style={{ marginTop: '20px' }}>
              <div className="action-column">
                <h4 style={{ marginBottom: '20px' }}>EXECUTIVE_SUMMARY // THE CONTEXT</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {detailMetrics.actionInsight.summary.map((narrative, i) => (
                    <div key={i} className="glass-card revelation-card" style={{
                      padding: '24px',
                      background: 'rgba(var(--text-primary-rgb), 0.03)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '20px',
                      position: 'relative'
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        lineHeight: '1.4',
                        color: 'var(--text-primary)',
                        marginBottom: '8px'
                      }}>
                        {narrative}
                      </div>
                      <div className="mono" style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '1px' }}>
                        TELEMETRY_CODE: {detailMetrics.actionInsight.status.replace(/ /g, '_')}_INSIGHT_0{i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="action-column">
                <h4>STRATEGIC_DIRECTIVES // EXECUTION PLAN</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {detailMetrics.surgicalPlan.length > 0 ? detailMetrics.surgicalPlan.map((step, idx) => (
                    <div key={idx} className="recommendation-card" style={{ padding: '20px', borderLeft: '3px solid var(--accent-secondary)' }}>
                      <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)', marginBottom: '8px', fontWeight: 800 }}>DIRECTIVE_0{idx + 1} // {step.task.toUpperCase()}</div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{step.action}</div>
                    </div>
                  )) : (
                    <div className="glass-card success" style={{ padding: '24px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                      <div className="mono" style={{ color: 'var(--accent-green)', fontWeight: '900', fontSize: '12px', letterSpacing: '1px' }}>SYSTEM_STATUS: OPTIMIZED</div>
                      <div style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-primary)', opacity: 0.7 }}>No immediate strategic intervention required.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '60px' }}>

            
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


            <div className="glass-card liquid-glass reveal-node" style={{ '--delay': '600ms', padding: '24px' } as React.CSSProperties}>
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
                const pData = allPluginsWithInsights.find(p => p.pluginName === pluginName);
                const rawStatus = (pData?.migrations[0]?.migrationStatus || "UNKNOWN").toLowerCase();
                const displayStatus = rawStatus.replace(/_/g, ' ');
                const priority = pData?.insight?.priorities?.severity || { color: 'transparent', status: 'Unknown' };

                const statusClass = rawStatus === 'success' ? 'status-success' :
                  (rawStatus === 'fail' || rawStatus === 'failure') ? 'status-failure' :
                    'status-pending';

                return (
                  <div
                    key={pluginName}
                    className={`terminal-card clickable kinetic-card liquid-glass in-view ${statusClass}`}
                    onClick={() => handleDrillDown(pluginName)}
                    style={{
                      cursor: 'pointer',
                      borderLeft: `3px solid ${priority.color}`
                    }}
                  >
                    <div className="task-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="mono" style={{ fontSize: '9px', fontWeight: 900, color: priority.color, letterSpacing: '1px' }}>
                          {priority.status.toUpperCase()}
                        </span>
                      </div>
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
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{workbenchPage} / {totalPages || 1}</span>
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
      const PHASES = [
        { range: [1, 1], label: 'Data Acquisition', cls: 'acquisition' },
        { range: [2, 3], label: 'Processing Layer', cls: 'processing' },
        { range: [4, 7], label: 'Delivery Engine', cls: 'delivery' },
        { range: [8, 10], label: 'Operations', cls: 'ops' },
      ];

      const archSteps = [
        {
          num: 1, title: "Data Acquisition", colorVar: "var(--accent-secondary)",
          imgSrc: dataAcquisitionImage,
          desc: "The application uses the `metadata-plugin-modernizer` repository via automated GitHub Actions as the primary data source. JSON and CSV files are fetched directly during the build process.",
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/><path d="M3.05 11a9 9 0 1 1 .5 4"/><polyline points="3 16 3 11 8 11"/></svg>
        },
        {
          num: 2, title: "Processing & Aggregation", colorVar: "var(--accent-amber)",
          desc: "A build-time layer parses schema datasets, extracts keys such as `migrationStatus`, and aggregates outcomes into optimized structural JSON outputs.",
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
        },
        {
          num: 3, title: "Data Validation", colorVar: "var(--accent-amber)",
          desc: "Schema validation applies default fallbacks and gracefully handles missing properties across datasets to ensure strict UI rendering stability.",
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/><path d="M9 7h6M9 17h6"/></svg>
        },
        {
          num: 4, title: "Static Site Generation", colorVar: "var(--accent-primary)",
          desc: "The frontend framework computes the JSON dataset artifacts into a scalable React & TypeScript build natively, eliminating continuous runtime APIs.",
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        },
        {
          num: 5, title: "Visualization Layer", colorVar: "var(--accent-primary)",
          imgSrc: visualizationLayerImage,
          desc: "Metrics are painted across highly interactive Apache ECharts, visualizing priority rankings, continuous integrations breakdowns, and distribution vectors.",
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></svg>
        },
        {
          num: 6, title: "User Interaction & UX", colorVar: "var(--accent-primary)",
          desc: "Usability architecture driven entirely by responsive, executive interactive filtering interfaces sorting telemetry data live based on user input loops.",
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="14.83" y1="9.17" x2="18.36" y2="5.64"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>
        },
        {
          num: 7, title: "Plugin Reporting", colorVar: "var(--accent-primary)",
          desc: "Dedicated visualization matrix for isolated plugin entities parsing missing BOMs, automated PR deployment statuses, and direct repository networking.",
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        },
        {
          num: 8, title: "Automation Stack", colorVar: "var(--accent-neon)",
          imgSrc: automationStackImage,
          desc: "An automated Continuous Integration pipeline validates dataset fetching, schema computation, and redeploys automatically via webhook routines.",
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        },
        {
          num: 9, title: "Deployment Target", colorVar: "var(--accent-neon)",
          desc: "Fully compiled environments map directly to GitHub Pages or `stats.jenkins.io` server architectures ensuring immense public request resilience.",
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        },
        {
          num: 10, title: "Extensibility", colorVar: "var(--accent-neon)",
          desc: "Comprehensive documentation maps core visualization data structures so developers can graft native logic rules directly into broader Jenkins ecosystems.",
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17" y1="15" x2="9" y2="15"/></svg>
        },
      ];

      return (
        <div className="arch-tab-root animate-fade-up" key="architecture">

          {/* Header */}
          <h2 className="arch-header reveal-node">
            Engine <span className="text-accent">Architecture</span>
          </h2>
          <p className="arch-intro reveal-node">
            This project follows a static, build-time data processing approach to transform Jenkins plugin modernization metadata into actionable visual insights.
          </p>

          {/* Pipeline Diagram */}
          <div className="arch-diagram reveal-node">
            <img src={architectureImage} alt="Static Data Pipeline Architecture" />
          </div>

          {/*
            FLOWBITE VERTICAL TIMELINE
            HTML pattern from https://flowbite.com/docs/components/timeline/#vertical-timeline
            ol.relative.border-s  →  .fb-timeline
            li.mb-10.ms-6         →  .fb-timeline-item
            span.absolute.-start-3.ring-8  →  .fb-node
            time badge, h3, p     →  .fb-phase-badge, .fb-item-title, .fb-item-body
          */}
          <ol className="fb-timeline">
            {archSteps.map((item) => {
              const phaseStart = PHASES.find(p => p.range[0] === item.num);
              return (
                <React.Fragment key={item.num}>
                  {phaseStart && (
                    <div className="fb-phase-divider">
                      <span className={`fb-phase-label ${phaseStart.cls}`}>{phaseStart.label}</span>
                    </div>
                  )}
                  <li
                    className="fb-timeline-item"
                    style={{ '--node-color': item.colorVar } as React.CSSProperties}
                  >
                    {/* ── Flowbite Node: span.absolute.-start-3.ring-8 ── */}
                    <span className="fb-node" title={item.title}>
                      <span className="fb-node-icon" style={{ color: 'currentColor' }}>{item.icon}</span>
                    </span>

                    {/* ── Flowbite Card body ── */}
                    <div className="fb-card">
                      {/* Flowbite: <time> badge pill */}
                      <span className="fb-phase-badge">[STEP_{item.num < 10 ? `0${item.num}` : item.num}]</span>

                      {/* Flowbite: h3 title */}
                      <h3 className="fb-item-title">{item.title}</h3>

                      {/* Blueprint image (optional) */}
                      {item.imgSrc && (
                        <div className="fb-blueprint">
                          <img src={item.imgSrc} alt={`${item.title} Blueprint`} />
                        </div>
                      )}

                      {/* Flowbite: p description */}
                      <p
                        className="fb-item-body"
                        dangerouslySetInnerHTML={{
                          __html: item.desc.replace(/`([^`]+)`/g, '<code>$1</code>')
                        }}
                      />
                    </div>
                  </li>
                </React.Fragment>
              );
            })}
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
            <h1 className="title font-black leading-[1.1] tracking-tight mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-[64px]" style={{ color: 'var(--text-primary)' }}>
              Jenkins Plugin <br className="hidden md:block" />
              <span className="plugin-name" style={{ backgroundImage: 'linear-gradient(45deg, var(--accent-primary), var(--accent-neon))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>Modernization Insights</span>
            </h1>

            <div className="flex flex-col gap-3 relative border-t md:border-t-0 md:border-l-[3px] border-white/20 pt-5 md:pt-0 md:pl-6 max-w-3xl">
              <div className="absolute top-0 left-[-3px] w-[3px] h-0 md:h-full bg-gradient-to-b from-[var(--accent-primary)] to-[var(--accent-neon)] hidden md:block"></div>

              <p className="text-lg sm:text-xl md:text-[22px] font-medium leading-relaxed tracking-wide m-0 drop-shadow-md" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>
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
      {(currentlyActiveTab === "Global Overview" || currentlyActiveTab === "Strategic Workbench" || currentlyActiveTab === "Data Explorer") && renderCommandBar()}

      <main id="main-content">
        {renderMainContent()}
      </main>

      {/* 🛠 V50: THE ORCHESTRATION TERMINAL (FLOATING TRAY) */}
      {surgeryQueue.length > 0 && (
        <div className="surgery-tray-container reveal-node">
          <div className="surgery-tray kinetic-card liquid-glass">
            <div className="tray-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="pulse-dot active"></div>
                <span className="mono" style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px' }}>
                  SURGERY_QUEUE // {surgeryQueue.length} ENTITIES SELECTED
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="tab-btn mini"
                  onClick={() => {
                    const masterScript = [
                      "#!/bin/bash",
                      `# AUTOMATED MODERNIZATION SCRIPT - GENERATED: ${new Date().toISOString()}`,
                      "# ----------------------------------------------------------------",
                      ...surgeryQueue.map(name => {
                        const plugin = allPluginsWithInsights.find(p => p.pluginName === name);
                        return [
                          `\n# --- Targeting: ${name} ---`,
                          ...(plugin?.insight.surgical.commands || [])
                        ].join('\n');
                      })
                    ].join('\n');

                    const blob = new Blob([masterScript], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `modernize_batch_${surgeryQueue.length}.sh`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  GENERATE_MASTER_SCRIPT (.SH)
                </button>
                <button
                  type="button"
                  className="tab-btn mini danger"
                  onClick={() => setSurgeryQueue([])}
                >
                  CLEAR
                </button>
              </div>
            </div>
            <div className="tray-item-list">
              {surgeryQueue.map(name => (
                <div key={name} className="tray-item mono" onClick={() => handleDrillDown(name)}>
                  {name} <span onClick={(e) => { e.stopPropagation(); toggleQueueItem(name); }} className="remove-cross">×</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
