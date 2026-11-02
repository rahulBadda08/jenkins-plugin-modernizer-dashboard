import React from "react";
import type { EnrichedPlugin } from "../domain/types";
import { sanitizeExternalUrl } from "../domain/security";

export interface DetailMetrics {
  actionInsight: {
    status: string;
    severity: 'danger' | 'warning' | 'success' | 'info';
    summary: string[];
  };
  priorities: Record<string, { label: string; status: string; color: string }>;
  checklist: Array<{ label: string; description: string; value: boolean }>;
  issueBreakdown: {
    deprecated: { label: string; value: boolean };
    ci: { label: string; value: boolean };
    pr: { label: string; value: boolean };
  };
  surgical: {
    drift: { gap: number; criticality: string };
    difficulty: number;
    commands: string[];
  };
  ranking: {
    label: string;
    severity: string;
    percentile: number;
  };
  findings: Array<{ issue: string; recommendation: string }>;
  surgicalPlan: Array<{ task: string; action: string }>;
}

export interface PluginDetailPanelProps {
  currentlySelectedPlugin: EnrichedPlugin | null | undefined;
  detailMetrics: DetailMetrics | null;
  currentlyActiveTab: string;
  surgeryQueue: string[];
  toggleQueueItem: (name: string) => void;
  setCurrentlyActiveTab: (tab: string) => void;
  formatLabel: (str: string) => string;
}

export const PluginDetailPanel: React.FC<PluginDetailPanelProps> = ({
  currentlySelectedPlugin,
  detailMetrics,
  currentlyActiveTab,
  surgeryQueue,
  toggleQueueItem,
  setCurrentlyActiveTab,
  formatLabel,
}) => {
  if (!currentlySelectedPlugin || !detailMetrics) {
    return (
      <div className="glass-card animate-fade-up" style={{ textAlign: "center", padding: "60px" }}>
        <h2>No migration statistics are available for '{currentlyActiveTab}' at this time.</h2>
      </div>
    );
  }

  const migrationData = currentlySelectedPlugin.activeMigration;

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

      {/* ── STRATEGIC ACTION PANEL (NARRATIVE COMMAND CENTER) ── */}
      <div className={`action-panel ${detailMetrics.actionInsight.severity} reveal-node`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="action-status-badge">
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 12px currentColor' }}></div>
              {detailMetrics.actionInsight.status}
            </div>
            <h3 className="action-header">Strategic Assessment</h3>
          </div>

          {/* Risk Indicator Meter */}
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

        {/* Strategic Priority HUD */}
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

        {/* BRUTAL TRUTH ISSUE BREAKDOWN HUD */}
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

        {/* Modernization Checklist HUD */}
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

        {/* CONTRIBUTION DIRECTIVE (GUIDED ACTION) */}
        <div className="contribution-hub reveal-node animate-delay-2" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <h4 className="mono" style={{ color: 'var(--accent-neon)', fontSize: '12px', letterSpacing: '2px', marginBottom: '8px' }}>CONTRIBUTION // DIRECTIVES</h4>
              <h3 className="title" style={{ fontSize: '24px' }}>Execute Modernization</h3>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }} className="mono">GUIDED_REMEDIATION_PATHWAY</div>
          </div>

          {(() => {
            const safeRepoUrl = sanitizeExternalUrl(currentlySelectedPlugin.pluginRepository);
            const safeIssuesUrl = safeRepoUrl ? `${safeRepoUrl.replace(/\.git$/i, '').replace(/\/$/, '')}/issues` : null;
            const safeCompareUrl = safeRepoUrl ? `${safeRepoUrl.replace(/\.git$/i, '').replace(/\/$/, '')}/compare` : null;

            return (
              <div className="action-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                {safeRepoUrl ? (
                  <a href={safeRepoUrl} target="_blank" rel="noreferrer" className="glass-card kinetic-card in-view" style={{ padding: '20px', textDecoration: 'none' }}>
                    <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)', marginBottom: '8px' }}>[STEP_01]</div>
                    <h5 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>Analyze Codebase</h5>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Inspect source files and technical debt in the primary repository.</p>
                    <div className="link-btn" style={{ fontWeight: 800, fontSize: '11px' }}>Visit GitHub Repository →</div>
                  </a>
                ) : (
                  <div className="glass-card in-view" style={{ padding: '20px', opacity: 0.6 }}>
                    <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)', marginBottom: '8px' }}>[STEP_01]</div>
                    <h5 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>Analyze Codebase</h5>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Repository link unavailable: protocol must be valid HTTPS without credentials.</p>
                    <div className="mono" style={{ color: 'var(--accent-amber)', fontSize: '10px' }}>[LINK_SUPPRESSED_BY_SECURITY_POLICY]</div>
                  </div>
                )}

                {safeIssuesUrl ? (
                  <a href={safeIssuesUrl} target="_blank" rel="noreferrer" className="glass-card kinetic-card in-view" style={{ padding: '20px', textDecoration: 'none' }}>
                    <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)', marginBottom: '8px' }}>[STEP_02]</div>
                    <h5 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>Survey Issues</h5>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Check for existing modernization blockers or security advisories.</p>
                    <div className="link-btn" style={{ fontWeight: 800, fontSize: '11px' }}>View Open Issues →</div>
                  </a>
                ) : (
                  <div className="glass-card in-view" style={{ padding: '20px', opacity: 0.6 }}>
                    <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-secondary)', marginBottom: '8px' }}>[STEP_02]</div>
                    <h5 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>Survey Issues</h5>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Issues link unavailable.</p>
                    <div className="mono" style={{ color: 'var(--accent-amber)', fontSize: '10px' }}>[LINK_SUPPRESSED_BY_SECURITY_POLICY]</div>
                  </div>
                )}

                {safeCompareUrl ? (
                  <a href={safeCompareUrl} target="_blank" rel="noreferrer" className="glass-card kinetic-card in-view" style={{ padding: '20px', textDecoration: 'none', borderLeft: '3px solid var(--accent-neon)' }}>
                    <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-neon)', marginBottom: '8px' }}>[STEP_03]</div>
                    <h5 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>Initiate Surgery</h5>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Create a modernization pull request based on terminal insights.</p>
                    <div className="link-btn" style={{ color: 'var(--accent-neon)', fontWeight: 800, fontSize: '11px' }}>Create Modernization PR →</div>
                  </a>
                ) : (
                  <div className="glass-card in-view" style={{ padding: '20px', opacity: 0.6, borderLeft: '3px solid var(--accent-neon)' }}>
                    <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-neon)', marginBottom: '8px' }}>[STEP_03]</div>
                    <h5 style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>Initiate Surgery</h5>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Compare link unavailable.</p>
                    <div className="mono" style={{ color: 'var(--accent-amber)', fontSize: '10px' }}>[LINK_SUPPRESSED_BY_SECURITY_POLICY]</div>
                  </div>
                )}
              </div>
            );
          })()}
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
              {(migrationData.tags || []).map((tag: string) => (
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
};
