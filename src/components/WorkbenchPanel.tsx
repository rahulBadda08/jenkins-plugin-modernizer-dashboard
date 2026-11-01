import React from "react";
import type { EnrichedPlugin } from "../domain/types";
import type { WorkbenchMetrics } from "../domain/selectors";

export interface WorkbenchPanelProps {
  isVisible: boolean;
  activeQueueFilter: string | null;
  setActiveQueueFilter?: (filter: string | null) => void;
  workbenchMetrics: WorkbenchMetrics;
  allPluginsWithInsights: EnrichedPlugin[];
  workbenchPage: number;
  setWorkbenchPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  onPluginSelect: (name: string) => void;
  onReturnToOverview: () => void;
}

export const WorkbenchPanel: React.FC<WorkbenchPanelProps> = ({
  isVisible,
  activeQueueFilter,
  workbenchMetrics,
  allPluginsWithInsights,
  workbenchPage,
  setWorkbenchPage,
  itemsPerPage,
  onPluginSelect,
  onReturnToOverview,
}) => {
  const baseQueue =
    activeQueueFilter === "ROADMAP"
      ? workbenchMetrics.roadmapList
      : workbenchMetrics.legacyAlignmentNames;
  const filteredQueue = baseQueue || [];
  const totalPages = Math.ceil(filteredQueue.length / itemsPerPage);
  const paginatedQueue = filteredQueue.slice(
    (workbenchPage - 1) * itemsPerPage,
    workbenchPage * itemsPerPage
  );

  return (
    <div
      id="panel-workbench"
      role="tabpanel"
      aria-labelledby="tab-workbench"
      tabIndex={0}
      className="tab-content animate-fade-up"
      key="workbench"
      hidden={!isVisible}
      style={{ display: isVisible ? "block" : "none" }}
    >
      <div className="tactical-board standalone reveal-node">
        <div className="board-header" style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <p
              className="hero-label"
              style={{ margin: 0, color: "var(--accent-secondary)" }}
            >
              SURGICAL_INTERVENTION_CONSOLE
            </p>
            <h2
              className="title"
              style={{
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ marginRight: "12px", verticalAlign: "middle" }}
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              {activeQueueFilter === "ROADMAP"
                ? "Priority Roadmap"
                : "Legacy Alignment"}
            </h2>
          </div>
          <button
            type="button"
            className="tab-btn"
            onClick={onReturnToOverview}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ marginRight: "8px" }}
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
        </div>

        <div className="task-grid">
          {paginatedQueue.map((pluginName) => {
            const pData = allPluginsWithInsights.find(
              (p) => p.pluginName === pluginName
            );
            const rawStatus = (
              pData?.activeMigration?.migrationStatus || "UNKNOWN"
            ).toLowerCase();
            const displayStatus = rawStatus.replace(/_/g, " ");
            const priority = pData?.insight?.priorities?.severity || {
              color: "transparent",
              status: "Unknown",
            };

            const statusClass =
              rawStatus === "success"
                ? "status-success"
                : rawStatus === "fail" || rawStatus === "failure"
                ? "status-failure"
                : "status-pending";

            return (
              <div
                key={pluginName}
                role="button"
                tabIndex={0}
                aria-label={`Inspect ${pluginName}`}
                className={`terminal-card clickable kinetic-card liquid-glass in-view ${statusClass}`}
                onClick={() => onPluginSelect(pluginName)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPluginSelect(pluginName);
                  }
                }}
                style={{
                  cursor: "pointer",
                  borderLeft: `3px solid ${priority.color}`,
                }}
              >
                <div className="task-body">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: "9px",
                        fontWeight: 900,
                        color: priority.color,
                        letterSpacing: "1px",
                      }}
                    >
                      {priority.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="terminal-title">{pluginName}</span>
                  <div style={{ marginTop: "8px" }}>
                    <span
                      className={`terminal-badge ${
                        rawStatus === "fail" ? "failure" : rawStatus
                      }`}
                    >
                      {displayStatus}
                    </span>
                  </div>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="2.5"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            );
          })}
          {filteredQueue.length === 0 && (
            <div
              style={{
                padding: "80px",
                textAlign: "center",
                opacity: 0.5,
                gridColumn: "1 / -1",
              }}
            >
              <p className="mono">No matches found in active queue</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "30px",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button
                type="button"
                className="tab-btn"
                disabled={workbenchPage === 1}
                onClick={() => setWorkbenchPage((p) => p - 1)}
                style={{
                  opacity: workbenchPage === 1 ? 0.3 : 1,
                  padding: "10px 24px",
                }}
              >
                Prev
              </button>
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  fontWeight: "bold",
                }}
              >
                {workbenchPage} / {totalPages || 1}
              </span>
              <button
                type="button"
                className="tab-btn"
                disabled={workbenchPage >= totalPages}
                onClick={() => setWorkbenchPage((p) => p + 1)}
                style={{
                  opacity: workbenchPage >= totalPages ? 0.3 : 1,
                  padding: "10px 24px",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkbenchPanel;
