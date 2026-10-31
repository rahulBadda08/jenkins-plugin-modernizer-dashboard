import { describe, it, expect } from 'vitest';
import { calculateHealthScore, getPluginInsight, getRemediationCommands } from '../scoring';
import type { PluginData } from '../types';

describe('scoring', () => {
  it('awards 100 points to fully modernized plugins with passing CI and merged PR', () => {
    const plugin: PluginData = {
      pluginName: 'git',
      pluginRepository: 'https://github.com/jenkinsci/git-plugin',
      migrations: [
        {
          migrationName: 'Modernize Plugin',
          migrationStatus: 'SUCCESS',
          pullRequestStatus: 'MERGED',
          pullRequestUrl: 'https://github.com/jenkinsci/git-plugin/pull/1',
          tags: ['bom', 'parent-pom'],
          checkRuns: { BOM: 'success', 'Parent Pom': 'success' },
          checkRunsSummary: 'success',
          jenkinsVersion: '2.452.3',
          timestamp: '2025-10-01T12:00:00Z',
        },
      ],
    };

    const score = calculateHealthScore(plugin);
    expect(score).toBe(100);

    const insight = getPluginInsight(plugin);
    expect(insight.actionInsight.severity).toBe('success');
    expect(insight.checklist.every(c => c.value)).toBe(true);
  });

  it('does not penalize missing checkRunsSummary as an active CI failure', () => {
    const pluginWithMissingSummary: PluginData = {
      pluginName: 'sample',
      pluginRepository: 'https://github.com/jenkinsci/sample-plugin',
      migrations: [
        {
          migrationName: 'Setup',
          migrationStatus: 'SUCCESS',
          pullRequestStatus: 'OPEN',
          pullRequestUrl: '',
          tags: [],
          checkRuns: { BOM: 'success' },
          // checkRunsSummary is omitted (simulating 295/431 plugins)
          jenkinsVersion: '2.452.3',
          timestamp: '2025-10-01T12:00:00Z',
        },
      ],
    };

    const pluginWithFailingSummary: PluginData = {
      ...pluginWithMissingSummary,
      migrations: [
        {
          ...pluginWithMissingSummary.migrations[0],
          checkRunsSummary: 'failure',
        },
      ],
    };

    const scoreMissing = calculateHealthScore(pluginWithMissingSummary);
    const scoreFailing = calculateHealthScore(pluginWithFailingSummary);

    // Missing summary incurs only a minor telemetry gap (-5) vs failing summary (-25)
    expect(scoreMissing).toBeGreaterThan(scoreFailing);
    expect(scoreMissing - scoreFailing).toBe(20);
  });

  it('penalizes failed migrations and outdated baselines', () => {
    const failingPlugin: PluginData = {
      pluginName: 'legacy',
      pluginRepository: 'https://github.com/jenkinsci/legacy-plugin',
      migrations: [
        {
          migrationName: 'Setup',
          migrationStatus: 'FAILURE',
          pullRequestStatus: 'CLOSED',
          pullRequestUrl: '',
          tags: ['deprecated'],
          checkRunsSummary: 'failure',
          jenkinsVersion: '1.625.3',
          timestamp: '2025-01-01T00:00:00Z',
        },
      ],
    };

    const score = calculateHealthScore(failingPlugin);
    expect(score).toBeLessThan(40);

    const insight = getPluginInsight(failingPlugin);
    expect(insight.actionInsight.severity).toBe('danger');
  });

  it('sanitizes plugin names in generated remediation commands', () => {
    const commands = getRemediationCommands(
      [
        { label: 'CI Configured', value: false, status: 'failed', description: '' },
      ],
      'plugin-with-special;rm -rf /'
    );

    expect(commands[0]).toContain('--repo jenkins-plugins/plugin-with-specialrm-rf');
    expect(commands[0]).not.toContain(';');
  });
});
