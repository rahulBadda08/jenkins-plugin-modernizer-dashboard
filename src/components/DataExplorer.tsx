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
  // ── 1. STATE MANAGEMENT ──
  // These internal state variables securely track user inputs securely. 
  // Any update to these triggers instantaneous local re-renders of the table grid.
  const [searchQuery, setSearchQuery] = useState("");
  const [migrationFilter, setMigrationFilter] = useState("ALL");
  const [prFilter, setPrFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [isMigrationDropdownOpen, setIsMigrationDropdownOpen] = useState(false);
  const [isPRDropdownOpen, setIsPRDropdownOpen] = useState(false);
  const itemsPerPage = 15;

  // ── 2. DATA CASCADING & FILTERING ──
  // useMemo caches the massive filtering computations. It guarantees that the 
  // complex text-matching and status-matching engines only recalculate when strictly necessary.
  const filteredPlugins = useMemo(() => {
    return plugins.filter((plugin) => {
      // Data Integrity: Exclude any artifacts that lack hard metrics
      const hasMigrations = plugin.migrations && plugin.migrations.length > 0;
      if (!hasMigrations) return false;

      // Filtering criteria 1: Fuzzy Text Search
      const matchesSearch = plugin.pluginName.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filtering criteria 2: Migration Status Drops
      let latestStatus = plugin.migrations[0].migrationStatus || "UNKNOWN";
      if (latestStatus.toUpperCase() === "FAILURE") latestStatus = "FAIL";
      
      const matchesMigration = migrationFilter === "ALL" || latestStatus.toUpperCase() === migrationFilter.toUpperCase();

      // Filtering criteria 3: Pull Request Status Drops
      const prStat = plugin.migrations[0].pullRequestStatus || "UNKNOWN";
      const matchesPR = prFilter === "ALL" || prStat.toUpperCase() === prFilter.toUpperCase();

      return matchesSearch && matchesMigration && matchesPR;
    });
  }, [plugins, searchQuery, migrationFilter, prFilter]);

  // ── 3. PAGINATION ENGINE ──
  // To avoid unrecoverable browser DOM lagging, we strictly slice the arrays into 15-item rendering limits.
  const totalPages = Math.ceil(filteredPlugins.length / itemsPerPage);
  const paginatedData = filteredPlugins.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ── 4. CSV EXPORT UTILITY ──
  // Instantly serializes the actively filtered dataset into a local spreadsheet file for Jenkins core maintainers.
  const formatTimestamp = (ts: string) => {
    if (!ts || ts === "") return "Unknown Date";
    // Jenkins outputs arbitrary hyphens (e.g. 2026-01-16T14-55-50) which breaks JS parsing.
    const [datePart, timePart] = ts.split('T');
    const validTs = timePart ? `${datePart}T${timePart.replace(/-/g, ':')}` : ts;
    const d = new Date(validTs);
    return isNaN(d.getTime()) ? ts : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const exportToCSV = () => {
    const headers = ["Plugin Name", "Migration Status", "PR Status", "Latest Run"];
    const csvRows = [headers.join(",")];

    // Build rows respecting active search boundaries
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

    // Native browser Blob download execution
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const exportNode = document.createElement('a');
    exportNode.href = url;
    exportNode.download = 'jenkins_filtered_plugins.csv';
    exportNode.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "20px" }}>
        <h2 className="title" style={{ margin: 0 }}>Plugin Data Explorer</h2>
        
        <button 
          onClick={exportToCSV}
          style={{ background: "#A78BFA", color: "#111827", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", gap: "8px", alignItems: "center" }}
        >
          Export to CSV
        </button>
      </div>
      
      {/* 4. THE FILTER CONTROLS */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', alignItems: 'center' }}>
        
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1 }}>
          <input 
            type="text" 
            placeholder="Search for a plugin" 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to page 1 if they start searching
            }}
            style={{ 
              width: '100%', 
              padding: '12px 12px 12px 40px', 
              borderRadius: '12px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              background: 'rgba(0,0,0,0.2)', 
              color: 'white',
              fontSize: '14px',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(167, 139, 250, 0.5)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>
        
        {/* Migration Status Dropdown */}
        <div style={{ position: 'relative', minWidth: '180px' }}>
          <button 
            onClick={() => {
              setIsMigrationDropdownOpen(!isMigrationDropdownOpen);
              setIsPRDropdownOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'rgba(17, 24, 39, 0.6)',
              border: isMigrationDropdownOpen ? '1px solid rgba(167, 139, 250, 0.8)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#F3F4F6',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isMigrationDropdownOpen ? '0 0 15px rgba(167, 139, 250, 0.2)' : 'none'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Premium Icon Box */}
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </span>
              {/* Stacked Label & Dynamic Value */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#6B7280', fontWeight: 'bold' }}>Migration</span>
                {migrationFilter === 'ALL' ? (
                  <span style={{ color: '#F3F4F6', fontSize: '14px', fontWeight: 'bold' }}>All</span>
                ) : migrationFilter === 'SUCCESS' ? (
                  <span style={{ color: '#34D399', fontSize: '14px', fontWeight: 'bold' }}>Success</span>
                ) : migrationFilter === 'FAIL' ? (
                  <span style={{ color: '#F87171', fontSize: '14px', fontWeight: 'bold' }}>Fail</span>
                ) : (
                  <span style={{ color: '#9CA3AF', fontSize: '14px', fontWeight: 'bold' }}>Unknown</span>
                )}
              </div>
            </span>
            <svg 
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: isMigrationDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isMigrationDropdownOpen && (
            <div 
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                background: 'rgba(17, 24, 39, 0.95)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                padding: '8px', zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: '4px',
                animation: 'fadeUp 0.2s ease-out forwards'
              }}
            >
              {[
                { value: 'ALL', label: 'All Migrations', color: '#F3F4F6' },
                { value: 'SUCCESS', label: 'SUCCESS', color: '#34D399' },
                { value: 'FAIL', label: 'FAIL', color: '#F87171' },
                { value: 'UNKNOWN', label: 'UNKNOWN', color: '#9CA3AF' }
              ].map((option) => (
                <div
                  key={option.value}
                  onClick={() => { setMigrationFilter(option.value); setCurrentPage(1); setIsMigrationDropdownOpen(false); }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  style={{
                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                    color: option.color, fontSize: '14px',
                    fontWeight: migrationFilter === option.value ? 'bold' : 'normal',
                    background: migrationFilter === option.value ? 'rgba(255,255,255,0.05)' : 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pull Request Status Dropdown */}
        <div style={{ position: 'relative', minWidth: '180px' }}>
          <button 
            onClick={() => {
              setIsPRDropdownOpen(!isPRDropdownOpen);
              setIsMigrationDropdownOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'rgba(17, 24, 39, 0.6)',
              border: isPRDropdownOpen ? '1px solid rgba(59, 130, 246, 0.8)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#F3F4F6',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isPRDropdownOpen ? '0 0 15px rgba(59, 130, 246, 0.2)' : 'none'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Premium Icon Box */}
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <circle cx="18" cy="18" r="3"></circle>
                   <circle cx="6" cy="6" r="3"></circle>
                   <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
                   <line x1="6" y1="9" x2="6" y2="21"></line>
                </svg>
              </span>
              {/* Stacked Label & Dynamic Value */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#6B7280', fontWeight: 'bold' }}>Pull Request</span>
                {prFilter === 'ALL' ? (
                  <span style={{ color: '#F3F4F6', fontSize: '14px', fontWeight: 'bold' }}>All</span>
                ) : prFilter === 'MERGED' ? (
                  <span style={{ color: '#A78BFA', fontSize: '14px', fontWeight: 'bold' }}>Merged</span>
                ) : prFilter === 'OPEN' ? (
                  <span style={{ color: '#60A5FA', fontSize: '14px', fontWeight: 'bold' }}>Open</span>
                ) : prFilter === 'CLOSED' ? (
                  <span style={{ color: '#F87171', fontSize: '14px', fontWeight: 'bold' }}>Closed</span>
                ) : (
                  <span style={{ color: '#9CA3AF', fontSize: '14px', fontWeight: 'bold' }}>Unknown</span>
                )}
              </div>
            </span>
            <svg 
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: isPRDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isPRDropdownOpen && (
            <div 
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                background: 'rgba(17, 24, 39, 0.95)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                padding: '8px', zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: '4px',
                animation: 'fadeUp 0.2s ease-out forwards'
              }}
            >
              {[
                { value: 'ALL', label: 'All PRs', color: '#F3F4F6' },
                { value: 'MERGED', label: 'MERGED', color: '#A78BFA' },
                { value: 'OPEN', label: 'OPEN', color: '#60A5FA' },
                { value: 'CLOSED', label: 'CLOSED', color: '#F87171' },
                { value: 'UNKNOWN', label: 'UNKNOWN', color: '#9CA3AF' }
              ].map((option) => (
                <div
                  key={option.value}
                  onClick={() => { setPrFilter(option.value); setCurrentPage(1); setIsPRDropdownOpen(false); }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  style={{
                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                    color: option.color, fontSize: '14px',
                    fontWeight: prFilter === option.value ? 'bold' : 'normal',
                    background: prFilter === option.value ? 'rgba(255,255,255,0.05)' : 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. THE RESULTS TABLE */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(167, 139, 250, 0.4)', background: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '13px' }}>
              <th style={{ padding: '16px 12px', borderTopLeftRadius: '8px' }}>Plugin Name</th>
              <th style={{ padding: '16px 12px' }}>Migration Status</th>
              <th style={{ padding: '16px 12px' }}>PR Status</th>
              <th style={{ padding: '16px 12px', borderTopRightRadius: '8px' }}>Latest Run</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((plugin) => {
              const migration = plugin.migrations[0];
              return (
                <tr key={plugin.pluginName} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>
                    <span 
                      onClick={() => onPluginSelect(plugin.pluginName)}
                      style={{ cursor: 'pointer' }}
                      title={`View interactive ECharts dashboard for ${plugin.pluginName}`}
                    >
                      {plugin.pluginName}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge badge-${(migration.migrationStatus || 'unknown').toLowerCase()}`}>
                       {migration.migrationStatus || "UNKNOWN"}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge badge-${(migration.pullRequestStatus || 'unknown').toLowerCase()}`}>
                       {(migration.pullRequestStatus || 'unknown').replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {formatTimestamp(migration.timestamp)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 6. PAGINATION CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Showing {filteredPlugins.length} total results
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="tab-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Previous
          </button>
          <span style={{ padding: '10px' }}>Page {currentPage} of {totalPages || 1}</span>
          <button 
            className="tab-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
