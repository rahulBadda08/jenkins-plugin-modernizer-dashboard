import { describe, it, expect } from 'vitest';
import { filterPlugins } from '../selectors';
import type { EnrichedPlugin } from '../types';

describe('selectors', () => {
  const dummyInsight: EnrichedPlugin['insight'] = {
    actionInsight: { status: '', severity: 'success', summary: [], recommendations: [] },
    priorities: {
      severity: { label: '', status: '', color: '' },
      maintenance: { label: '', status: '', color: '' },
      security: { label: '', status: '', color: '' },
    },
    checklist: [],
    issueBreakdown: {
      deprecated: { label: '', value: false, display: '' },
      ci: { label: '', value: true, display: '' },
      pr: { label: '', value: true, display: '' },
    },
    surgical: {
      drift: { gap: 0, criticality: 'low', currentVersion: '', baselineVersion: '' },
      commands: [],
      difficulty: 1,
    },
  };

  const samplePlugins: EnrichedPlugin[] = [
    {
      pluginName: 'git',
      pluginRepository: 'https://github.com/jenkinsci/git-plugin',
      migrations: [],
      activeMigration: {
        migrationName: 'Modernize Plugin',
        migrationStatus: 'SUCCESS',
        pullRequestStatus: 'MERGED',
        pullRequestUrl: '',
        tags: ['BOM', 'SCM'],
        timestamp: '2025-10-01T00:00:00Z',
      },
      healthScore: 95,
      insight: dummyInsight,
    },
    {
      pluginName: 'subversion',
      pluginRepository: 'https://github.com/jenkinsci/subversion-plugin',
      migrations: [],
      activeMigration: {
        migrationName: 'Setup',
        migrationStatus: 'FAILURE',
        pullRequestStatus: 'OPEN',
        pullRequestUrl: '',
        tags: ['SCM'],
        timestamp: '2025-09-01T00:00:00Z',
      },
      healthScore: 40,
      insight: {
        ...dummyInsight,
        actionInsight: { status: '', severity: 'danger', summary: [], recommendations: [] },
      },
    },
  ];

  it('filters plugins by search query matching plugin name or repo', () => {
    const results = filterPlugins(samplePlugins, { searchTerm: 'subver' });
    expect(results).toHaveLength(1);
    expect(results[0].pluginName).toBe('subversion');
  });

  it('filters plugins by topic tag', () => {
    const bomPlugins = filterPlugins(samplePlugins, { topicFilter: 'BOM' });
    expect(bomPlugins).toHaveLength(1);
    expect(bomPlugins[0].pluginName).toBe('git');
  });

  it('filters plugins by migration status', () => {
    const successPlugins = filterPlugins(samplePlugins, { statusFilter: 'SUCCESS' });
    expect(successPlugins).toHaveLength(1);
    expect(successPlugins[0].pluginName).toBe('git');

    const failPlugins = filterPlugins(samplePlugins, { statusFilter: 'FAILURE' });
    expect(failPlugins).toHaveLength(1);
    expect(failPlugins[0].pluginName).toBe('subversion');
  });

  it('filters plugins by severity', () => {
    const dangerPlugins = filterPlugins(samplePlugins, { severityFilter: 'DANGER' });
    expect(dangerPlugins).toHaveLength(1);
    expect(dangerPlugins[0].pluginName).toBe('subversion');
  });
});
