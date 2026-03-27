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

  if (loading) return <div className="container"><p className="loading">Loading real data...</p></div>;
  if (error)   return <div className="container"><p className="error">Error: {error}</p></div>;
  if (!plugin) return null;

  const m = plugin.migrations[0];

  // ── Bar Chart 1: CI Check Runs ─────────────────────────────
  const checkNames  = Object.keys(m.checkRuns);
  const checkValues = checkNames.map((k) => (m.checkRuns[k] === "success" ? 1 : 0));
  const checkColors = checkValues.map((v) => (v === 1 ? "#4ade80" : "#f87171"));

  // ── Bar Chart 2: Code Changes ──────────────────────────────
  const codeLabels = ["Additions", "Deletions", "Changed Files"];
  const codeValues = [m.additions, m.deletions, m.changedFiles];
  const codeColors = ["#4ade80", "#f87171", "#60a5fa"];

  // ── Pie Chart 1: Check Runs Summary ───────────────────────
  const passCount = checkValues.filter((v) => v === 1).length;
  const failCount = checkValues.length - passCount;
  const checkPieData = [
    { name: "Success", value: passCount },
    { name: "Null / Pending", value: failCount },
  ];

  // ── Pie Chart 2: Migration & PR Status ────────────────────
  const statusPieData = [
    { name: `Migration: ${m.migrationStatus}`, value: 1 },
    { name: `PR: ${m.pullRequestStatus}`, value: 1 },
  ];

  return (
    <div className="container">
      <h1 className="title">
        Jenkins Plugin Modernizer —{" "}
        <span className="plugin-name">{plugin.pluginName}</span>
      </h1>

      <a
        href={plugin.pluginRepository}
        target="_blank"
        rel="noreferrer"
        className="repo-link"
      >
        {plugin.pluginRepository}
      </a>

      {/* ── Summary Card ── */}
      <div className="summary-card">
        <div className="summary-row">
          <div className="summary-item">
            <span className="summary-label">Recipe</span>
            <span className="summary-value">{m.migrationName}</span>
          </div>
        </div>
        <div className="summary-row">
          <div className="summary-item">
            <span className="summary-label">Migration Status</span>
            <span className={`badge badge-${m.migrationStatus}`}>{m.migrationStatus}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">PR Status</span>
            <span className={`badge badge-${m.pullRequestStatus}`}>{m.pullRequestStatus}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Check Runs</span>
            <span className="badge badge-pending">{m.checkRunsSummary}</span>
          </div>
        </div>
        <div className="summary-row">
          <div className="summary-item">
            <span className="summary-label">Plugin Version</span>
            <span className="summary-value">{m.pluginVersion}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Jenkins Version</span>
            <span className="summary-value">{m.jenkinsVersion}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Tags</span>
            <span className="tags">
              {m.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </span>
          </div>
        </div>
        <div className="summary-row">
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
      <div className="grid">
        <div className="card">
          <PieChart
            data={checkPieData}
            title="Check Runs Summary"
            colors={["#4ade80", "#f87171"]}
            donut
          />
        </div>

        <div className="card">
          <BarChart
            labels={codeLabels}
            data={codeValues}
            colors={codeColors}
            title="Code Changes"
          />
        </div>

        <div className="card wide">
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

        <div className="card">
          <PieChart
            data={statusPieData}
            title="Migration & PR Status"
            colors={["#22c55e", "#8b5cf6"]}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
