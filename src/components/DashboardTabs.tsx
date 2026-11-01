import React from "react";

export interface DashboardTabsProps {
  activeTab: string;
  onSelectTab: (tabName: string) => void;
}

const PRIMARY_TABS = [
  { name: "Global Overview", label: "Overview", id: "tab-overview", panelId: "panel-overview" },
  { name: "Strategic Workbench", label: "Workbench", id: "tab-workbench", panelId: "panel-workbench" },
  { name: "Data Explorer", label: "Explorer", id: "tab-explorer", panelId: "panel-explorer" },
  { name: "Methodology", label: "Methodology", id: "tab-methodology", panelId: "panel-methodology" },
] as const;

export const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, onSelectTab }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = PRIMARY_TABS.findIndex((t) => t.name === activeTab);
    if (currentIndex === -1) return;

    let targetIndex = -1;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % PRIMARY_TABS.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + PRIMARY_TABS.length) % PRIMARY_TABS.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      targetIndex = PRIMARY_TABS.length - 1;
    }

    if (targetIndex !== -1) {
      const target = PRIMARY_TABS[targetIndex];
      onSelectTab(target.name);
      document.getElementById(target.id)?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Dashboard Views"
      className="tabs"
      style={{
        display: "flex",
        gap: "8px",
        overflowX: "auto",
        paddingBottom: "8px",
        alignItems: "center",
      }}
      onKeyDown={handleKeyDown}
    >
      {PRIMARY_TABS.map((tab) => {
        const isSelected = activeTab === tab.name;
        return (
          <button
            key={tab.id}
            id={tab.id}
            type="button"
            role="tab"
            aria-controls={tab.panelId}
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelectTab(tab.name)}
            className={`tab-btn ${isSelected ? "active" : ""}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default DashboardTabs;
