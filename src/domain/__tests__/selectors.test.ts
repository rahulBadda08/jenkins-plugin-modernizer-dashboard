import { describe, it, expect } from 'vitest';
import { filterPlugins, computeWorkbenchMetrics } from '../selectors';
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
        additions: 100,
        deletions: 50,
        jenkinsVersion: '2.580.2',
      },
      healthScore: 95,
      insight: {
        ...dummyInsight,
        actionInsight: { status: '', severity: 'success', summary: [], recommendations: [] },
      },
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
        tags: ['SCM', 'Infra'],
        timestamp: '2025-09-01T00:00:00Z',
        additions: 200,
        deletions: 80,
        jenkinsVersion: '2.440.2', // Outdated (< 2.440.3)
      },
      healthScore: 40,
      insight: {
        ...dummyInsight,
        actionInsight: { status: '', severity: 'danger', summary: [], recommendations: [] },
      },
    },
    {
      pluginName: 'workflow-aggregator',
      pluginRepository: 'https://github.com/jenkinsci/workflow-aggregator-plugin',
      migrations: [],
      activeMigration: {
        migrationName: 'Bump BOM',
        migrationStatus: 'SUCCESS',
        pullRequestStatus: 'CLOSED',
        pullRequestUrl: '',
        tags: ['Pipeline'],
        timestamp: '2025-08-01T00:00:00Z',
        additions: 10,
        deletions: 5,
        jenkinsVersion: '2.450.1',
      },
      healthScore: 70,
      insight: {
        ...dummyInsight,
        actionInsight: { status: '', severity: 'warning', summary: [], recommendations: [] },
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

    const unmatched = filterPlugins(samplePlugins, { topicFilter: 'NonExistent' });
    expect(unmatched).toHaveLength(0);
  });

  it('filters plugins by migration status', () => {
    const successPlugins = filterPlugins(samplePlugins, { statusFilter: 'SUCCESS' });
    expect(successPlugins).toHaveLength(2);

    const failPlugins = filterPlugins(samplePlugins, { statusFilter: 'FAILURE' });
    expect(failPlugins).toHaveLength(1);
    expect(failPlugins[0].pluginName).toBe('subversion');
  });

  it('filters plugins by PR status (OPEN, MERGED, and FAILURE/FAIL)', () => {
    const merged = filterPlugins(samplePlugins, { prFilter: 'MERGED' });
    expect(merged).toHaveLength(1);
    expect(merged[0].pluginName).toBe('git');

    const openPrs = filterPlugins(samplePlugins, { prFilter: 'OPEN' });
    expect(openPrs).toHaveLength(1);
    expect(openPrs[0].pluginName).toBe('subversion');

    const closedPrs = filterPlugins(samplePlugins, { prFilter: 'CLOSED' });
    expect(closedPrs).toHaveLength(1);
    expect(closedPrs[0].pluginName).toBe('workflow-aggregator');
  });

  it('filters plugins by severity aliases (CRITICAL, WARNING, OPTIMIZED)', () => {
    const critical = filterPlugins(samplePlugins, { severityFilter: 'CRITICAL' });
    expect(critical).toHaveLength(1);
    expect(critical[0].pluginName).toBe('subversion');

    const warning = filterPlugins(samplePlugins, { severityFilter: 'WARNING' });
    expect(warning).toHaveLength(1);
    expect(warning[0].pluginName).toBe('workflow-aggregator');

    const optimized = filterPlugins(samplePlugins, { severityFilter: 'OPTIMIZED' });
    expect(optimized).toHaveLength(1);
    expect(optimized[0].pluginName).toBe('git');

    const direct = filterPlugins(samplePlugins, { severityFilter: 'danger' });
    expect(direct).toHaveLength(1);
    expect(direct[0].pluginName).toBe('subversion');
  });

  it('computes centralized workbench metrics with ranking and outdated counts', () => {
    const metrics = computeWorkbenchMetrics(samplePlugins, 3);
    expect(metrics.totalCount).toBe(3);
    expect(metrics.filteredCount).toBe(3);
    expect(metrics.modernizedPercentage).toBe(67);
    expect(metrics.legacyAlignmentNames).toContain('subversion');
    expect(metrics.mainRiskArea).toBe('SCM');
    expect(metrics.roadmapList).toHaveLength(3);
  });
});
