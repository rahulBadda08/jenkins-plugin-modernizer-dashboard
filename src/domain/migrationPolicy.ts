import type { Migration, PluginData } from './types';

export const EMPTY_MIGRATION: Migration = {
  migrationName: 'None',
  migrationStatus: 'UNKNOWN',
  pullRequestStatus: 'UNKNOWN',
  pullRequestUrl: '',
  tags: [],
  timestamp: '',
};

export function parseMigrationTimestamp(timestamp: string): number {
  if (!timestamp || typeof timestamp !== 'string') return 0;
  // Handle formats like "2025-09-04T12-58-34" by normalizing time hyphens to colons
  const normalized = timestamp.includes('T')
    ? timestamp.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3Z')
    : timestamp;
  const parsed = Date.parse(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

export function selectActiveMigration(migrations?: Migration[] | null): Migration | null {
  if (!migrations || migrations.length === 0) return null;
  if (migrations.length === 1) return migrations[0];

  const sorted = [...migrations].sort((a, b) => {
    const timeA = parseMigrationTimestamp(a.timestamp);
    const timeB = parseMigrationTimestamp(b.timestamp);
    if (timeA !== timeB) {
      return timeB - timeA; // newest timestamp first
    }
    return (b.key || '').localeCompare(a.key || '');
  });

  return sorted[0] || null;
}

export function getActiveMigration(pluginOrMigrations?: PluginData | Migration[] | null): Migration {
  if (!pluginOrMigrations) return EMPTY_MIGRATION;
  const list = Array.isArray(pluginOrMigrations) ? pluginOrMigrations : pluginOrMigrations.migrations;
  return selectActiveMigration(list) || EMPTY_MIGRATION;
}
