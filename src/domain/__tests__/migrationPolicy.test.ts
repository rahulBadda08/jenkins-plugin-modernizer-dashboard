import { describe, it, expect } from 'vitest';
import { parseMigrationTimestamp, selectActiveMigration, getActiveMigration, EMPTY_MIGRATION } from '../migrationPolicy';
import type { Migration } from '../types';

describe('migrationPolicy', () => {
  it('parses timestamps with hyphenated time formats', () => {
    const ts = '2025-09-04T12-58-34';
    const parsed = parseMigrationTimestamp(ts);
    expect(parsed).toBeGreaterThan(0);
    const date = new Date(parsed);
    expect(date.getUTCFullYear()).toBe(2025);
    expect(date.getUTCMonth()).toBe(8); // September (0-indexed)
    expect(date.getUTCDate()).toBe(4);
  });

  it('parses standard ISO timestamps', () => {
    const ts = '2025-10-15T14:30:00Z';
    const parsed = parseMigrationTimestamp(ts);
    expect(parsed).toBeGreaterThan(0);
  });

  it('returns 0 for missing or invalid timestamps', () => {
    expect(parseMigrationTimestamp('')).toBe(0);
    expect(parseMigrationTimestamp('invalid-date')).toBe(0);
  });

  it('selects the newest migration by timestamp', () => {
    const older: Migration = {
      migrationName: 'Older Run',
      migrationStatus: 'FAILURE',
      pullRequestStatus: 'OPEN',
      pullRequestUrl: '',
      tags: [],
      timestamp: '2025-07-22T08-08-54',
    };

    const newer: Migration = {
      migrationName: 'Newer Run',
      migrationStatus: 'SUCCESS',
      pullRequestStatus: 'MERGED',
      pullRequestUrl: '',
      tags: [],
      timestamp: '2025-09-04T12-17-48',
    };

    const migrations = [older, newer];
    const active = selectActiveMigration(migrations);
    expect(active?.migrationName).toBe('Newer Run');
    expect(active?.migrationStatus).toBe('SUCCESS');
  });

  it('returns null for empty migration arrays in selectActiveMigration', () => {
    expect(selectActiveMigration([])).toBeNull();
  });

  it('returns the only migration when single item is present', () => {
    const single: Migration = {
      migrationName: 'Single Run',
      migrationStatus: 'SUCCESS',
      pullRequestStatus: 'OPEN',
      pullRequestUrl: '',
      tags: [],
      timestamp: '2025-01-01T00:00:00Z',
    };
    expect(selectActiveMigration([single])).toEqual(single);
  });

  it('getActiveMigration returns safe fallback EMPTY_MIGRATION when migrations is empty or null', () => {
    expect(getActiveMigration(null)).toEqual(EMPTY_MIGRATION);
    expect(getActiveMigration([])).toEqual(EMPTY_MIGRATION);
    expect(getActiveMigration({ pluginName: 'sample', pluginRepository: '', migrations: [] })).toEqual(EMPTY_MIGRATION);
  });
});
