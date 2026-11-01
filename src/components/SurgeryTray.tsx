import React from "react";
import type { EnrichedPlugin } from "../domain/types";
import { generateMasterScript } from "../application/remediation/generateMasterScript";

export interface SurgeryTrayProps {
  queue: string[];
  allPluginsWithInsights: EnrichedPlugin[];
  onClearQueue: () => void;
  onInspectPlugin: (name: string) => void;
  onRemovePlugin: (name: string) => void;
}

export const SurgeryTray: React.FC<SurgeryTrayProps> = ({
  queue,
  allPluginsWithInsights,
  onClearQueue,
  onInspectPlugin,
  onRemovePlugin,
}) => {
  if (queue.length === 0) return null;

  const handleDownloadMasterScript = () => {
    const masterScript = generateMasterScript(allPluginsWithInsights, queue);
    const blob = new Blob([masterScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `modernize_batch_${queue.length}.sh`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      aria-label="Surgical Batch Orchestration Tray"
      className="surgery-tray-container reveal-node"
    >
      <div className="surgery-tray kinetic-card liquid-glass">
        <div className="tray-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="pulse-dot active" aria-hidden="true"></div>
            <span
              className="mono"
              style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "1px" }}
            >
              SURGERY_QUEUE // {queue.length} ENTITIES SELECTED
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="tab-btn mini"
              onClick={handleDownloadMasterScript}
              aria-label="Download generated bash automation script"
            >
              GENERATE_MASTER_SCRIPT (.SH)
            </button>
            <button
              type="button"
              className="tab-btn mini danger"
              onClick={onClearQueue}
              aria-label="Clear all plugins from surgery queue"
            >
              CLEAR
            </button>
          </div>
        </div>
        <div className="tray-item-list" role="list" aria-label="Selected Plugins">
          {queue.map((name) => (
            <div
              key={name}
              role="listitem"
              className="tray-item mono"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <button
                type="button"
                className="tray-item-label"
                onClick={() => onInspectPlugin(name)}
                aria-label={`Inspect ${name}`}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  font: "inherit",
                  padding: 0,
                }}
              >
                {name}
              </button>
              <button
                type="button"
                aria-label={`Remove ${name} from surgery queue`}
                onClick={() => onRemovePlugin(name)}
                className="remove-cross"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  padding: "0 4px",
                  fontSize: "14px",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default SurgeryTray;
