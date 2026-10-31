import type { PluginData, Migration, MigrationStatus, PRStatus } from './types';
import { parseMigrationTimestamp } from './migrationPolicy';

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeMigrationStatus(raw: unknown): MigrationStatus {
  if (typeof raw !== 'string' || !raw.trim()) return 'UNKNOWN';
  const upper = raw.trim().toUpperCase();
  if (upper === 'SUCCESS' || upper === 'PASS') return 'SUCCESS';
  if (upper === 'FAILURE' || upper === 'FAIL') return 'FAILURE';
  if (upper === 'PENDING') return 'PENDING';
  if (upper === 'RUNNING') return 'RUNNING';
  if (upper === 'ABORTED') return 'ABORTED';
  return 'UNKNOWN';
}

export function normalizePRStatus(raw: unknown): PRStatus {
  if (typeof raw !== 'string' || !raw.trim()) return 'UNKNOWN';
  const upper = raw.trim().toUpperCase();
  if (upper === 'MERGED') return 'MERGED';
  if (upper === 'OPEN') return 'OPEN';
  if (upper === 'CLOSED') return 'CLOSED';
  if (upper === 'DRAFT') return 'DRAFT';
  return 'UNKNOWN';
}

export function validateMigration(raw: unknown): Migration | null {
  if (!isObject(raw)) return null;

  const migrationName = typeof raw.migrationName === 'string' ? raw.migrationName : 'Unknown Migration';
  const migrationStatus = normalizeMigrationStatus(raw.migrationStatus);
  const pullRequestStatus = normalizePRStatus(raw.pullRequestStatus);
  const pullRequestUrl = typeof raw.pullRequestUrl === 'string' ? raw.pullRequestUrl : '';
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [];
  const timestamp = typeof raw.timestamp === 'string' ? raw.timestamp : '';

  let checkRuns: Record<string, string | null> | undefined;
  if (isObject(raw.checkRuns)) {
    checkRuns = {};
    for (const [k, v] of Object.entries(raw.checkRuns)) {
      checkRuns[k] = typeof v === 'string' ? v : null;
    }
  }

  const checkRunsSummary = typeof raw.checkRunsSummary === 'string' ? raw.checkRunsSummary : undefined;
  const additions = typeof raw.additions === 'number' ? raw.additions : 0;
  const deletions = typeof raw.deletions === 'number' ? raw.deletions : 0;
  const changedFiles = typeof raw.changedFiles === 'number' ? raw.changedFiles : 0;
  const pluginVersion = typeof raw.pluginVersion === 'string' ? raw.pluginVersion : undefined;
  const jenkinsVersion = typeof raw.jenkinsVersion === 'string' ? raw.jenkinsVersion : undefined;
  const key = typeof raw.key === 'string' ? raw.key : undefined;

  return {
    migrationName,
    migrationStatus,
    pullRequestStatus,
    pullRequestUrl,
    tags,
    checkRuns,
    checkRunsSummary,
    additions,
    deletions,
    changedFiles,
    pluginVersion,
    jenkinsVersion,
    timestamp,
    key,
  };
}

export function validatePluginData(raw: unknown): PluginData | null {
  if (!isObject(raw)) return null;
  if (typeof raw.pluginName !== 'string' || !raw.pluginName.trim()) return null;

  const pluginName = raw.pluginName.trim();
  const pluginRepository = typeof raw.pluginRepository === 'string' ? raw.pluginRepository : '';
  const rawMigrations = Array.isArray(raw.migrations) ? raw.migrations : [];
  const migrations: Migration[] = [];

  for (const m of rawMigrations) {
    const valid = validateMigration(m);
    if (valid) migrations.push(valid);
  }

  // Ensure deterministic active migration ordering (newest timestamp first)
  migrations.sort((a, b) => {
    const timeA = parseMigrationTimestamp(a.timestamp);
    const timeB = parseMigrationTimestamp(b.timestamp);
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return (b.key || '').localeCompare(a.key || '');
  });

  return {
    pluginName,
    pluginRepository,
    migrations,
  };
}

export function validatePluginDataset(raw: unknown): PluginData[] {
  if (!Array.isArray(raw)) return [];
  const validated: PluginData[] = [];
  for (const item of raw) {
    const plugin = validatePluginData(item);
    if (plugin) validated.push(plugin);
  }
  return validated;
}
