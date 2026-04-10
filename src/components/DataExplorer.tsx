import { useState, useMemo } from 'react';

// We copy the exact same TypeScript definitions to stay safe
type MigrationStatus = "SUCCESS" | "FAILURE" | "PENDING" | "RUNNING" | "ABORTED" | string;
type PRStatus = "MERGED" | "OPEN" | "CLOSED" | "DRAFT" | string;

interface Migration {
  migrationName: string;
  migrationStatus: MigrationStatus;
  pullRequestStatus: PRStatus;
  pullRequestUrl: string;
  timestamp: string;
}

interface PluginData {
  pluginName: string;
  pluginRepository: string;
  migrations: Migration[];
}

interface DataExplorerProps {
  plugins: PluginData[];
  onPluginSelect: (pluginName: string) => void;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PLUGIN DATA EXPLORER (Interactive Paginated Table Component)
 * Defines the UI and functional hooks for parsing the raw Jenkins ecosystem dataset.
 * It natively bypasses browser lag by utilizing local pagination and useMemo
 * computations rather than directly hammering the DOM with 400+ rows.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function DataExplorer({ plugins, onPluginSelect }: DataExplorerProps) {
  // ── 1. STATE & RESPONSIVENESS ──
  const [searchQuery, setSearchQuery] = useState("");
  const [migrationFilter, setMigrationFilter] = useState("ALL");
  const [prFilter, setPrFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [isMigrationDropdownOpen, setIsMigrationDropdownOpen] = useState(false);
  const [isPRDropdownOpen, setIsPRDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const itemsPerPage = 15;

  // Track window resizing for mobile-card toggle
  useState(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  });

  // ── 2. DATA CASCADING & FILTERING ──
  const filteredPlugins = useMemo(() => {
    return plugins.filter((plugin) => {
      const hasMigrations = plugin.migrations && plugin.migrations.length > 0;
      if (!hasMigrations) return false;

      const matchesSearch = plugin.pluginName.toLowerCase().includes(searchQuery.toLowerCase());
      
      let latestStatus = plugin.migrations[0].migrationStatus || "UNKNOWN";
      if (latestStatus.toUpperCase() === "FAILURE") latestStatus = "FAIL";
      
      const matchesMigration = migrationFilter === "ALL" || latestStatus.toUpperCase() === migrationFilter.toUpperCase();

      const prStat = plugin.migrations[0].pullRequestStatus || "UNKNOWN";
      const matchesPR = prFilter === "ALL" || prStat.toUpperCase() === prFilter.toUpperCase();

      return matchesSearch && matchesMigration && matchesPR;
    });
  }, [plugins, searchQuery, migrationFilter, prFilter]);

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

  const exportToCSV = () => {
    const headers = ["Plugin Name", "Migration Status", "PR Status", "Latest Run"];
    const csvRows = [headers.join(",")];
    filteredPlugins.forEach(plugin => {
      const migration = plugin.migrations[0];
      const row = [
        `"${plugin.pluginName}"`,
        `"${migration.migrationStatus || 'UNKNOWN'}"`,
        `"${(migration.pullRequestStatus || 'UNKNOWN').replace("_", " ")}"`,
        `"${formatTimestamp(migration.timestamp)}"`
      ];
      csvRows.push(row.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const exportNode = document.createElement('a');
    exportNode.href = url;
    exportNode.download = 'jenkins_filtered_plugins.csv';
    exportNode.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card reveal-node" style={{ padding: isMobile ? '20px' : '40px' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: "40px", gap: '20px' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>TELEMETRY ACCESS</p>
          <h2 className="title" style={{ fontSize: isMobile ? '28px' : '32px', margin: 0 }}>Data Explorer</h2>
        </div>
        
        <button 
          onClick={exportToCSV}
          className="tab-btn active"
          style={{ padding: '8px 24px', width: isMobile ? '100%' : 'auto' }}
        >
          Download CSV
        </button>
      </div>
      
      {/* 4. THE CONSOLE CONTROLS */}
      <div style={{ display: 'flex', gap: isMobile ? '24px' : '12px', marginBottom: '40px', alignItems: 'flex-end', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        
        {/* Search Input */}
        <div style={{ flex: 1, minWidth: isMobile ? '100%' : '300px', width: '100%' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>SEARCH REGISTRY</p>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Filter by plugin name..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{ 
                width: '100%', 
                padding: '16px 20px', 
                borderRadius: '16px', 
                border: '1px solid rgba(255,255,255,0.08)', 
                background: 'rgba(0,0,0,0.3)', 
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s'
              }}
            />
          </div>
        </div>
        
        {/* Dropdown Filters */}
        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Migration Dropdown */}
          <div style={{ position: 'relative', flex: 1 }}>
            <button 
              onClick={() => { setIsMigrationDropdownOpen(!isMigrationDropdownOpen); setIsPRDropdownOpen(false); }}
              className={`tab-btn ${migrationFilter !== 'ALL' ? 'active' : ''}`}
              style={{ 
                width: '100%',
                minWidth: isMobile ? '0' : '220px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="telemetry-icon-box" style={{ width: '28px', height: '28px', marginBottom: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span className="telemetry-label" style={{ fontSize: '8px' }}>Migration</span>
                  <span className="telemetry-value" style={{ fontSize: '12px' }}>{migrationFilter === 'ALL' ? 'All Status' : migrationFilter}</span>
                </div>
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>

            {isMigrationDropdownOpen && (
              <div 
                className="reveal-node"
                style={{ position: 'absolute', top: '100%', marginTop: '12px', width: '100%', minWidth: '200px', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '8px', zIndex: 1000, boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}
              >
                {[
                  { value: 'ALL', label: 'All Statuses', color: '#fff' },
                  { value: 'SUCCESS', label: 'SUCCESS', color: '#34D399' },
                  { value: 'FAIL', label: 'FAIL', color: '#F87171' },
                  { value: 'UNKNOWN', label: 'UNKNOWN', color: '#94a3b8' }
                ].map(opt => (
                  <div 
                    key={opt.value}
                    onClick={() => { setMigrationFilter(opt.value); setIsMigrationDropdownOpen(false); setCurrentPage(1); }}
                    style={{ padding: '10px 14px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: migrationFilter === opt.value ? opt.color : 'var(--text-secondary)', background: migrationFilter === opt.value ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: opt.color }}></div>
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PR Dropdown */}
          <div style={{ position: 'relative', flex: 1 }}>
            <button 
              onClick={() => { setIsPRDropdownOpen(!isPRDropdownOpen); setIsMigrationDropdownOpen(false); }}
              className={`tab-btn ${prFilter !== 'ALL' ? 'active' : ''}`}
              style={{ 
                width: '100%',
                minWidth: isMobile ? '0' : '220px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="telemetry-icon-box" style={{ width: '28px', height: '28px', marginBottom: 0, color: '#60A5FA', borderColor: 'rgba(96, 165, 250, 0.2)', backgroundColor: 'rgba(96, 165, 250, 0.1)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span className="telemetry-label" style={{ fontSize: '8px' }}>Pull Request</span>
                  <span className="telemetry-value" style={{ fontSize: '12px' }}>{prFilter === 'ALL' ? 'All PRs' : prFilter}</span>
                </div>
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>

            {isPRDropdownOpen && (
              <div 
                className="reveal-node"
                style={{ position: 'absolute', top: '100%', marginTop: '12px', width: '100%', minWidth: '200px', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '8px', zIndex: 1000, boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}
              >
                {[
                  { value: 'ALL', label: 'All PRs', color: '#fff' },
                  { value: 'MERGED', label: 'MERGED', color: '#A78BFA' },
                  { value: 'OPEN', label: 'OPEN', color: '#60A5FA' },
                  { value: 'CLOSED', label: 'CLOSED', color: '#F87171' },
                  { value: 'UNKNOWN', label: 'UNKNOWN', color: '#94a3b8' }
                ].map(opt => (
                  <div 
                    key={opt.value}
                    onClick={() => { setPrFilter(opt.value); setIsPRDropdownOpen(false); setCurrentPage(1); }}
                    style={{ padding: '10px 14px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: prFilter === opt.value ? opt.color : 'var(--text-secondary)', background: prFilter === opt.value ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: opt.color }}></div>
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. THE RESULTS (Table or Cards) */}
      {!isMobile ? (
        <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '16px 20px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Plugin Entity</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Migration</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Pull Request</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Last Analysis</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((plugin) => {
                const migration = plugin.migrations[0];
                return (
                  <tr 
                    key={plugin.pluginName} 
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <span 
                        onClick={() => onPluginSelect(plugin.pluginName)}
                        style={{ cursor: 'pointer', color: 'white', fontWeight: 600, fontSize: '15px' }}
                      >
                        {plugin.pluginName}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge badge-${(migration.migrationStatus || 'unknown').toLowerCase()}`}>
                         {migration.migrationStatus || "UNKNOWN"}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge badge-${(migration.pullRequestStatus || 'unknown').toLowerCase()}`}>
                         {(migration.pullRequestStatus || 'unknown').replace("_", " ")}
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
            const migration = plugin.migrations[0];
            return (
              <div 
                key={plugin.pluginName}
                onClick={() => onPluginSelect(plugin.pluginName)}
                className="animate-fade-up"
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.06)', 
                  borderRadius: '24px', 
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 700, margin: 0, flex: 1 }}>{plugin.pluginName}</h3>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${(migration.migrationStatus || 'unknown').toLowerCase()}`}>
                    {migration.migrationStatus || "UNKNOWN"}
                  </span>
                  <span className={`badge badge-${(migration.pullRequestStatus || 'unknown').toLowerCase()}`}>
                    {(migration.pullRequestStatus || 'unknown').replace("_", " ")}
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
          TRACE COMPLETED: {filteredPlugins.length} ENTITIES FOUND
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
          <span style={{ fontSize: '13px', color: 'white', fontWeight: 'bold' }}>{currentPage} / {totalPages || 1}</span>
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
