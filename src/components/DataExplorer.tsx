import { useState, useEffect } from 'react';

// We copy the exact same TypeScript definitions to stay safe
type MigrationStatus = "SUCCESS" | "FAILURE" | "PENDING" | "RUNNING" | "ABORTED" | string;
type PRStatus = "MERGED" | "OPEN" | "CLOSED" | "DRAFT" | string;

interface Migration {
  migrationName: string;
  migrationStatus: MigrationStatus;
  pullRequestStatus: PRStatus;
  pullRequestUrl: string;
  tags: string[];
  checkRuns?: Record<string, string | null>;
  checkRunsSummary?: string;
  jenkinsVersion?: string;
  timestamp: string;
}

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
}

interface PluginData {
  pluginName: string;
  pluginRepository: string;
  migrations: Migration[];
  insight?: PluginInsight;
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

interface DataExplorerProps {
  plugins: PluginData[];
  onPluginSelect: (pluginName: string) => void;
  externalSearch?: string;
  externalMigrationFilter?: string;
  externalPrFilter?: string;
  roadmapList?: string[];
  legacyAlignmentList?: string[];
  onClearExternal?: () => void;
}

export default function DataExplorer({ 
  plugins, 
  onPluginSelect, 
  externalSearch, 
  externalMigrationFilter = "ALL",
  roadmapList, 
  legacyAlignmentList
}: DataExplorerProps) {
  // ── 1. STATE & RESPONSIVENESS ──
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const itemsPerPage = 15;

  // Track window resizing for mobile-card toggle
  useState(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  });

  // ── 2. DATA CASCADING & RESET ──
  // Reset pagination when the filter changes (plugins prop)
  useEffect(() => {
    setCurrentPage(1);
  }, [plugins, externalSearch, externalMigrationFilter]);

  // The parent (Dashboard.tsx) handles all semantic filtering (Severity, PR, Topic, Search).
  // DataExplorer simply renders the resultant 'plugins' array.
  const filteredPlugins = plugins;

  // ── 3. PAGINATION ENGINE ──
  const totalPages = Math.ceil(filteredPlugins.length / itemsPerPage);
  const paginatedData = filteredPlugins.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ── 4. CSV EXPORT UTILITY ──
  const formatTimestamp = (ts: string) => {
    if (!ts || ts === "") return "Unknown Date";
    const [datePart, timePart] = ts.split('T');
    const validTs = timePart ? `${datePart}T${timePart.replace(/-/g, ':')}` : ts;
    const d = new Date(validTs);
    return isNaN(d.getTime()) ? ts : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const exportToExcel = async () => {
    try {
      // Lazy load ExcelJS using the direct pre-bundled distribution file.
      // This bypasses Vite's strict dependency optimizer cache which throws fetch errors
      // if the dev server was not entirely rebooted after the npm installation.
      // @ts-expect-error: TypeScript lacks implicit type maps for direct pre-bundled JS distribution sub-paths
      const ExcelJS = await import('exceljs/dist/exceljs.min.js');
      
      // Initialize standard workbook handling both ESM and CommonJS resolving formats
      const WorkbookClass = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook || (window as any).ExcelJS?.Workbook;
      if (!WorkbookClass) {
        throw new Error("ExcelJS Workbook constructor failed to resolve from module.");
      }
      const workbook = new WorkbookClass();
      
      workbook.creator = 'Jenkins Plugin Modernizer Engine';
      workbook.created = new Date();
      
      // Add styled sheet
      const sheet = workbook.addWorksheet('Telemetry Snapshot', {
        properties: { tabColor: { argb: 'FF0F1524' } },
        views: [{ state: 'frozen', ySplit: 1 }]
      });

      // Structure columns
      sheet.columns = [
        { header: 'PLUGIN_NAME', key: 'pluginName', width: 45 },
        { header: 'MIGRATION_STATUS', key: 'migrationStatus', width: 25 },
        { header: 'PR_STATUS', key: 'prStatus', width: 20 },
        { header: 'REPOSITORY_ACTION_LINK', key: 'actionUrl', width: 50 },
        { header: 'LAST_ANALYSIS_DATE', key: 'analysisDate', width: 30 }
      ];

      // Style the Header Row
      const headerRow = sheet.getRow(1);
      headerRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF151C2F' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 30;

      // Load data
      filteredPlugins.forEach(plugin => {
        const migration = plugin.migrations?.[0];
        const pName = plugin.pluginName;
        const mStatus = (migration?.migrationStatus || 'UNKNOWN').toUpperCase();
        const prStatus = (migration?.pullRequestStatus || 'UNKNOWN').replace("_", " ").toUpperCase();
        const ts = formatTimestamp(migration?.timestamp || "");
        
        const prUrl = migration?.pullRequestUrl || plugin.pluginRepository || '';

        const row = sheet.addRow({
          pluginName: pName,
          migrationStatus: mStatus,
          prStatus: prStatus,
          actionUrl: prUrl ? { text: 'View Repository / PR', hyperlink: prUrl } : 'N/A',
          analysisDate: ts
        });

        // Style row alignments
        row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        row.height = 25;

        // Color coding specific badges
        const statusCell = row.getCell('migrationStatus');
        statusCell.font = { bold: true };
        if (mStatus === 'SUCCESS') statusCell.font.color = { argb: 'FF10B981' };
        else if (mStatus === 'FAILURE' || mStatus === 'FAIL') statusCell.font.color = { argb: 'FFEF4444' };
        else if (mStatus === 'UNKNOWN') statusCell.font.color = { argb: 'FFFF5500' };
        else statusCell.font.color = { argb: 'FFF59E0B' };

        // Action URL styling
        const urlCell = row.getCell('actionUrl');
        if (prUrl) {
          urlCell.font = { color: { argb: 'FF3B82F6' }, underline: true };
        }
      });

      // Export to Buffer and force download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileSaverModule = await import('file-saver');
      const saveAs = fileSaverModule.saveAs || fileSaverModule.default?.saveAs || (fileSaverModule as any).default;
      if (typeof saveAs !== 'function') throw new Error("FileSaver couldn't be loaded properly.");
      
      saveAs(blob, 'Jenkins_Telemetry_Snapshot.xlsx');
    } catch (err: any) {
      console.error("Excel Generation Error:", err);
      // Fallback alert for the user if processing crashes
      window.alert("Export Error: " + (err.message || 'The snapshot engine encountered an issue rendering the spreadsheet.'));
    }
  };
  const exportToCSV = () => {
    try {
      const headers = ['PLUGIN_NAME', 'MIGRATION_STATUS', 'PR_STATUS', 'REPOSITORY_ACTION_LINK', 'LAST_ANALYSIS_DATE'];
      const rows = filteredPlugins.map(plugin => {
        const migration = plugin.migrations?.[0];
        const prUrl = migration?.pullRequestUrl || plugin.pluginRepository || '';
        return [
          `"${plugin.pluginName}"`,
          `"${(migration?.migrationStatus || 'UNKNOWN').toUpperCase()}"`,
          `"${(migration?.pullRequestStatus || 'UNKNOWN').replace("_", " ").toUpperCase()}"`,
          `"${prUrl}"`,
          `"${formatTimestamp(migration?.timestamp || "")}"`
        ];
      });

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'Jenkins_Telemetry_Snapshot.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("CSV Generation Error:", err);
      window.alert("Export Error: " + (err.message || 'CSV generation failed.'));
    }
  };

  const exportToJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(filteredPlugins, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'Jenkins_Telemetry_Snapshot.json');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("JSON Generation Error:", err);
      window.alert("Export Error: " + (err.message || 'JSON generation failed.'));
    }
  };

  return (
    <div className="glass-card reveal-node animate-fade-up" style={{ padding: isMobile ? '20px' : '40px' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: "40px", gap: '20px' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>TELEMETRY ACCESS</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className="title" style={{ fontSize: isMobile ? '28px' : '32px', margin: 0 }}>Data Explorer</h2>
            {externalSearch && (
              <span className="system-status-tag" style={{ background: 'var(--accent-amber)', color: 'black', border: 'none' }}>
                {externalSearch} ACTIVE
              </span>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto', flexWrap: 'wrap' }}>
          <button 
            onClick={exportToExcel}
            className="tab-btn mini" 
            style={{ flex: 1, display: 'flex', justifyContent: 'center', fontSize: '11px' }}
            title="Export to Microsoft Excel"
          >
            XLSX
          </button>
          <button 
            onClick={exportToCSV}
            className="tab-btn mini" 
            style={{ flex: 1, display: 'flex', justifyContent: 'center', fontSize: '11px' }}
            title="Export to CSV"
          >
            CSV
          </button>
          <button 
            onClick={exportToJSON}
            className="tab-btn mini" 
            style={{ flex: 1, display: 'flex', justifyContent: 'center', fontSize: '11px' }}
            title="Export to JSON"
          >
            JSON
          </button>
        </div>
      </div>

      {/* 4. THE CONSOLE CONTROLS */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', marginBottom: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        </div>
      </div>

      {/* 5. THE RESULTS */}
      {!isMobile ? (
        <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid var(--card-border)', background: 'rgba(var(--text-primary-rgb), 0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(var(--text-primary-rgb), 0.05)' }}>
                <th style={{ padding: '16px 20px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Priority</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Plugin Entity</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Migration</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Pull Request</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Last Analysis</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((plugin: any) => {
                const migration = plugin.migrations?.[0] || {} as Migration;
                const priority = plugin.insight?.priorities?.severity || { color: 'var(--text-secondary)', status: 'Unknown' };
                
                return (
                  <tr 
                    key={plugin.pluginName} 
                    style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--text-primary-rgb), 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} title={`Severity: ${priority.status}`}>
                        <div style={{ 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          background: priority.color,
                          boxShadow: `0 0 10px ${priority.color}` 
                        }}></div>
                        <span className="mono" style={{ fontSize: '10px', fontWeight: 800, color: priority.color }}>{priority.status.toUpperCase()}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span 
                          onClick={() => onPluginSelect(plugin.pluginName)}
                          style={{ cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: '15px' }}
                        >
                          {plugin.pluginName}
                        </span>
                        {roadmapList?.includes(plugin.pluginName) && (
                          <span style={{ fontSize: '10px', background: 'rgba(96, 165, 250, 0.1)', color: 'var(--accent-secondary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>ROADMAP</span>
                        )}
                        {legacyAlignmentList?.includes(plugin.pluginName) && (
                          <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>LEGACY</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge badge-${(migration.migrationStatus || 'unknown').toLowerCase()}`}>
                         {formatLabel(migration.migrationStatus || "UNKNOWN")}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge badge-${(migration.pullRequestStatus || 'unknown').toLowerCase()}`}>
                         {formatLabel(migration.pullRequestStatus || 'unknown')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {formatTimestamp(migration.timestamp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {paginatedData.map((plugin) => {
            const migration = plugin.migrations?.[0] || {} as Migration;
            return (
              <div 
                key={plugin.pluginName}
                onClick={() => onPluginSelect(plugin.pluginName)}
                className="animate-fade-up"
                style={{ 
                  background: 'rgba(var(--text-primary-rgb), 0.03)', 
                  border: '1px solid var(--card-border)', 
                  borderRadius: '24px', 
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700, margin: 0, flex: 1 }}>{plugin.pluginName}</h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {plugin.insight?.priorities?.severity && (
                    <span style={{ 
                      fontSize: '10px', 
                      background: `rgba(${plugin.insight.priorities.severity.color === 'var(--accent-red)' ? '239, 68, 68' : '245, 158, 11'}, 0.1)`, 
                      color: plugin.insight.priorities.severity.color, 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontWeight: 900,
                      border: `1px solid ${plugin.insight.priorities.severity.color}33`
                    }}>
                      {plugin.insight.priorities.severity.status.toUpperCase()}
                    </span>
                  )}
                  {roadmapList?.includes(plugin.pluginName) && (
                    <span style={{ fontSize: '10px', background: 'rgba(96, 165, 250, 0.1)', color: 'var(--accent-secondary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>ROADMAP</span>
                  )}
                  {legacyAlignmentList?.includes(plugin.pluginName) && (
                    <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>LEGACY</span>
                  )}
                  <span className={`badge badge-${(migration.migrationStatus || 'unknown').toLowerCase()}`}>
                    {formatLabel(migration.migrationStatus || "UNKNOWN")}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {formatTimestamp(migration.timestamp)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. PAGINATION CONTROLS */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', gap: '20px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', letterSpacing: '0.5px', textAlign: 'center' }}>
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-end' }}>
          <button 
            className="tab-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            style={{ opacity: currentPage === 1 ? 0.3 : 1, padding: isMobile ? '8px 20px' : '10px 24px' }}
          >
            Prev
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{currentPage} / {totalPages || 1}</span>
          <button 
            className="tab-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            style={{ opacity: currentPage >= totalPages ? 0.3 : 1, padding: isMobile ? '8px 20px' : '10px 24px' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
