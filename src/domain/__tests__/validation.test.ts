import { describe, it, expect } from 'vitest';
import {
  validateMigration,
  validatePluginData,
  validatePluginDataset,
  normalizeMigrationStatus,
  normalizePRStatus,
} from '../validation';

describe('validation', () => {
  it('normalizes migration statuses reliably', () => {
    expect(normalizeMigrationStatus('SUCCESS')).toBe('SUCCESS');
    expect(normalizeMigrationStatus('pass')).toBe('SUCCESS');
    expect(normalizeMigrationStatus('fail')).toBe('FAILURE');
    expect(normalizeMigrationStatus('FAILURE')).toBe('FAILURE');
    expect(normalizeMigrationStatus('aborted')).toBe('ABORTED');
    expect(normalizeMigrationStatus('')).toBe('UNKNOWN');
    expect(normalizeMigrationStatus(null)).toBe('UNKNOWN');
  });

  it('normalizes pull request statuses reliably', () => {
    expect(normalizePRStatus('MERGED')).toBe('MERGED');
    expect(normalizePRStatus('open')).toBe('OPEN');
    expect(normalizePRStatus('closed')).toBe('CLOSED');
    expect(normalizePRStatus('draft')).toBe('DRAFT');
    expect(normalizePRStatus('none')).toBe('UNKNOWN');
    expect(normalizePRStatus(undefined)).toBe('UNKNOWN');
  });

  it('preserves all baseline fallback and metadata fields during migration validation', () => {
    const raw = {
      migrationName: 'Upgrade parent POM',
      migrationStatus: 'SUCCESS',
      pullRequestStatus: 'OPEN',
      pullRequestUrl: 'https://github.com/pull/2',
      jenkinsVersion: '2.440.1',
      jenkinsBaseline: '2.452.3',
      targetBaseline: '2.500.0',
      effectiveBaseline: '2.580.2',
      migrationDescription: 'Automated recipe upgrade to modern parent POM',
      migrationId: 'recipe-parent-pom-5.12',
      timestamp: '2026-10-31T12-00-00',
    };

    const validated = validateMigration(raw);
    expect(validated).not.toBeNull();
    expect(validated?.jenkinsVersion).toBe('2.440.1');
    expect(validated?.jenkinsBaseline).toBe('2.452.3');
    expect(validated?.targetBaseline).toBe('2.500.0');
    expect(validated?.effectiveBaseline).toBe('2.580.2');
    expect(validated?.migrationDescription).toBe('Automated recipe upgrade to modern parent POM');
    expect(validated?.migrationId).toBe('recipe-parent-pom-5.12');
  });

  it('validates and extracts structured plugin objects', () => {
    const raw = {
      pluginName: 'workflow-aggregator',
      pluginRepository: 'https://github.com/jenkinsci/workflow-aggregator-plugin.git',
      migrations: [
        {
          migrationName: 'Setup the Jenkinsfile',
          migrationStatus: 'SUCCESS',
          pullRequestStatus: 'MERGED',
          pullRequestUrl: 'https://github.com/pull/1',
          tags: ['chore', 'pipeline'],
          timestamp: '2025-09-04T12-58-34',
        },
      ],
    };

    const validated = validatePluginData(raw);
    expect(validated).not.toBeNull();
    expect(validated?.pluginName).toBe('workflow-aggregator');
    expect(validated?.migrations).toHaveLength(1);
    expect(validated?.migrations[0].migrationStatus).toBe('SUCCESS');
  });

  it('rejects malformed records without valid pluginName', () => {
    expect(validatePluginData(null)).toBeNull();
    expect(validatePluginData({})).toBeNull();
    expect(validatePluginData({ pluginName: '' })).toBeNull();
    expect(validatePluginData({ pluginName: 123 })).toBeNull();
  });

  it('validates a dataset of mixed valid and malformed entries', () => {
    const mixed = [
      { pluginName: 'valid-one', migrations: [] },
      null,
      { notAPlugin: true },
      { pluginName: 'valid-two', migrations: [] },
    ];

    const result = validatePluginDataset(mixed);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.pluginName)).toEqual(['valid-one', 'valid-two']);
  });
});
