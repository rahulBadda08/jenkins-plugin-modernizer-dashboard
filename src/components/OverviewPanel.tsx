import React from "react";
import BarChart from "./BarChart";
import PieChart from "./PieChart";
import MarqueeHeader from "./MarqueeHeader";

export interface OverviewPanelProps {
  currentlyActiveTab: string;
  workbenchMetrics: {
    totalCount: number;
    filteredCount: number;
    legacyAlignmentPercentage: number;
    modernizedPercentage: number;
    mainRiskArea: string;
  };
  heroCard1Ref?: React.RefObject<HTMLDivElement | null>;
  heroCard2Ref?: React.RefObject<HTMLDivElement | null>;
  heroCard3Ref?: React.RefObject<HTMLDivElement | null>;
  chartRef?: React.RefObject<HTMLDivElement | null>;
  hubCard1Ref?: React.RefObject<HTMLDivElement | null>;
  hubCard2Ref?: React.RefObject<HTMLDivElement | null>;
  hubCard3Ref?: React.RefObject<HTMLDivElement | null>;
  hudRef?: React.RefObject<HTMLDivElement | null>;
  topPieData: Array<{ name: string; value: number; insight?: string; severity?: string }>;
  integrityLabels: string[];
  integrityData: number[];
  integrityInsights: string[];
  overviewLabels: string[];
  overviewData: number[];
  baselineHealthSummary: {
    pieData: Array<{ name: string; value: number; insight?: string; severity?: string }>;
    driftLabels: string[];
    driftData: number[];
    driftInsights: string[];
  };
  grandTotalAdditions: number;
  grandTotalDeletions: number;
  grandTotalFilesChanged: number;
  highImpactTargets: Array<{
    pluginName: string;
    impactScore: number;
    insight: {
      surgical: {
        drift: {
          gap: number;
        };
      };
    };
  }>;
  activateLegacyView: () => void;
  activateRoadmap: () => void;
  activateBaselineBucket: (bucket: string) => void;
  handleDrillDown: (pluginName: string) => void;
  formatLabel: (str: string) => string;
  theme?: "dark" | "light";
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  currentlyActiveTab,
  workbenchMetrics,
  heroCard1Ref,
  heroCard2Ref,
  heroCard3Ref,
  chartRef,
  hubCard1Ref,
  hubCard2Ref,
  hubCard3Ref,
  hudRef,
  topPieData,
  integrityLabels,
  integrityData,
  integrityInsights,
  overviewLabels,
  overviewData,
  baselineHealthSummary,
  grandTotalAdditions,
  grandTotalDeletions,
  grandTotalFilesChanged,
  highImpactTargets,
  activateLegacyView,
  activateRoadmap,
  activateBaselineBucket,
  handleDrillDown,
  formatLabel,
  theme = "dark",
}) => {
  return (
    <div
      id="panel-overview"
      role="tabpanel"
      aria-labelledby="tab-overview"
      tabIndex={0}
      className="tab-content"
      key="global"
      hidden={currentlyActiveTab !== "Global Overview"}
      style={{ display: currentlyActiveTab === "Global Overview" ? 'flex' : 'none', flexDirection: 'column', gap: '32px' }}
    >
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

        <div
          ref={heroCard2Ref}
          role="button"
          tabIndex={0}
          aria-label="Inspect Legacy Core Alignment Gap"
          className="glass-card hero-card risk-glow kinetic-card liquid-glass tier-2 in-view"
          onClick={activateLegacyView}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              activateLegacyView();
            }
          }}
          style={{ cursor: 'pointer' }}
        >
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

      <div ref={chartRef} className="charts-grid reveal-node animate-delay-4">
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

      <div className="charts-grid reveal-node animate-delay-5" style={{ marginTop: '30px' }}>
        <div className="glass-card chart-card">
          <PieChart
            data={baselineHealthSummary.pieData}
            title="Baseline Drift Radar"
            theme={theme}
            onItemClick={activateBaselineBucket}
          />
        </div>
        <div className="glass-card chart-card">
          <BarChart
            labels={baselineHealthSummary.driftLabels}
            data={baselineHealthSummary.driftData}
            insights={baselineHealthSummary.driftInsights}
            colors={new Array(baselineHealthSummary.driftData.length).fill('#ef4444')}
            title="Highest Baseline Drift Targets"
            theme={theme}
            rotateLabel={35}
            tooltipMode="drift"
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
          <div
            ref={hubCard1Ref}
            role="button"
            tabIndex={0}
            aria-label="Inspect Legacy Plugins"
            className="glass-card hub-card risk clickable kinetic-card liquid-glass animate-delay-1"
            onClick={activateLegacyView}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activateLegacyView();
              }
            }}
          >
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

          <div
            ref={hubCard3Ref}
            role="button"
            tabIndex={0}
            aria-label="Activate Priority Roadmap Work Queue"
            className="glass-card hub-card roadmap clickable kinetic-card liquid-glass animate-delay-3"
            onClick={activateRoadmap}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activateRoadmap();
              }
            }}
          >
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
                    strokeDashoffset: (282.7 - (282.7 * (grandTotalFilesChanged / (workbenchMetrics.totalCount * 5 || 1))))
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
            <span className="pulse-dot danger"></span> Strategic Prioritization
          </div>
          <h2 className="hub-title" style={{ fontSize: '24px' }}>High Impact <span className="mono text-accent">Targets</span></h2>
          <p className="hub-subtitle">Top 5 entities identified with the highest Modernization Impact Index.</p>
        </div>

        <div className="task-grid">
          {highImpactTargets.map((target, idx) => (
            <div
              key={target.pluginName}
              className="glass-card tactical-task-card kinetic-card in-view"
              onClick={() => handleDrillDown(target.pluginName)}
              style={{ '--delay': `${idx * 100}ms` } as React.CSSProperties}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
                <div className="mono" style={{ opacity: 0.15, fontSize: '28px', fontWeight: 900 }}>{idx + 1}</div>
                <div>
                  <span className="task-plugin-name">{target.pluginName}</span>
                  <div className="task-telemetry">
                    <div className="telemetry-item">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="3"><path d="M12 2v20M2 12h20" /></svg>
                      <span className="hero-desc mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>{target.impactScore.toFixed(0)} IMPACT INDEX</span>
                    </div>
                    <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.08)' }}></div>
                    <div className="telemetry-item">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="3"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      <span className="hero-desc mono" style={{ fontSize: '10px', opacity: 0.5 }}>{target.insight.surgical.drift.gap} DRIFT</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`task-badge ${target.impactScore > 100 ? 'danger' : target.impactScore > 40 ? 'warning' : 'success'}`}>
                {target.impactScore > 100 ? 'HIGH_PRIORITY' : target.impactScore > 40 ? 'MODERATE_PRIORITY' : 'ALIGNED_TARGET'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OverviewPanel;
