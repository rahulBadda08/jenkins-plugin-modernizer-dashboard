import "./App.css";
import BarChart from "./barChart";
import PieChart from "./pieChart";
import { useEffect, useState } from "react";

const DATA_URL =
  "https://raw.githubusercontent.com/jenkins-infra/metadata-plugin-modernizer/refs/heads/main/git/reports/aggregated_migrations.json";

interface Migration {
  migrationName: string;
  migrationStatus: string;
  pullRequestStatus: string;
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

function App() {
  const [plugin, setPlugin] = useState<PluginData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch data");
        return res.json();
      })
      .then((data: PluginData) => {
        setPlugin(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="container"><div className="loading">Loading plugin data...</div></div>;
  if (error)   return <div className="container"><div className="error">Error: {error}</div></div>;
  if (!plugin) return null;

  const m = plugin.migrations[0];
  if (!m) return <div className="container"><p className="error">No migrations found.</p></div>;

  // ── Bar Chart 1: CI Check Runs ─────────────────────────────
  const checkNames  = Object.keys(m.checkRuns || {});
  const checkValues = checkNames.map((k) => (m.checkRuns[k] === "success" ? 1 : 0));
  const checkColors = checkValues.map((v) => (v === 1 ? "#10B981" : "#EF4444"));

  // ── Bar Chart 2: Code Changes ──────────────────────────────
  const codeLabels = ["Additions", "Deletions", "Changed Files"];
  const codeValues = [m.additions, m.deletions, m.changedFiles];
  // Using neon green, neon red, neon blue
  const codeColors = ["#10B981", "#EF4444", "#3B82F6"];

  // ── Pie Chart 1: Check Runs Summary ───────────────────────
  const passCount = checkValues.filter((v) => v === 1).length;
  const failCount = checkValues.length - passCount;
  const checkPieData = [
    { name: "Success", value: passCount },
    { name: "Pending / Fail", value: failCount },
  ];

  // ── Pie Chart 2: Migration & PR Status ────────────────────
  const statusPieData = [
    { name: `Migration: ${m.migrationStatus}`, value: 1 },
    { name: `PR: ${m.pullRequestStatus}`, value: 1 },
  ];

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">
          Jenkins Modernizer <br />
          <span className="plugin-name">{plugin.pluginName}</span>
        </h1>

        <a
          href={plugin.pluginRepository}
          target="_blank"
          rel="noreferrer"
          className="repo-link delay-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
          Repository
        </a>
      </header>

      {/* ── Summary Card ── */}
      <div className="glass-card summary-card delay-2">
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Recipe</span>
            <span className="summary-value">{m.migrationName}</span>
          </div>

          <div className="summary-item">
            <span className="summary-label">Migration Status</span>
            <span className={`badge badge-${m.migrationStatus}`}>{m.migrationStatus}</span>
          </div>

          <div className="summary-item">
            <span className="summary-label">PR Status</span>
            <span className={`badge badge-${m.pullRequestStatus}`}>{m.pullRequestStatus.replace("_", " ")}</span>
          </div>

          <div className="summary-item">
            <span className="summary-label">Check Runs</span>
            <span className="badge badge-pending">{m.checkRunsSummary}</span>
          </div>

          <div className="summary-item">
            <span className="summary-label">Plugin Version</span>
            <span className="summary-value">{m.pluginVersion}</span>
          </div>

          <div className="summary-item">
            <span className="summary-label">Jenkins Version</span>
            <span className="summary-value">{m.jenkinsVersion}</span>
          </div>

          <div className="summary-item">
            <span className="summary-label">Pull Request</span>
            <a href={m.pullRequestUrl} target="_blank" rel="noreferrer" className="pr-link">
              View on GitHub
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>

          <div className="summary-item">
            <span className="summary-label">Timestamp</span>
            <span className="summary-value">{m.timestamp}</span>
          </div>

          <div className="summary-item" style={{ gridColumn: "1 / -1" }}>
            <span className="summary-label">Tags</span>
            <div className="tags">
              {m.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="charts-grid delay-3">
        <div className="glass-card chart-card">
          <PieChart
            data={checkPieData}
            title="Check Runs Summary"
            colors={["#10B981", "#EF4444"]}
            donut
          />
        </div>

        <div className="glass-card chart-card">
          <BarChart
            labels={codeLabels}
            data={codeValues}
            colors={codeColors}
            title="Code Changes"
          />
        </div>

        <div className="glass-card chart-card full-width">
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

        <div className="glass-card chart-card full-width delay-4">
          <PieChart
            data={statusPieData}
            title="Migration & PR Status"
            colors={["#3B82F6", "#8B5CF6"]}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
