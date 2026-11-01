import { describe, it, expect } from 'vitest';
import { calculateHealthScore, getPluginInsight, getRemediationCommands, MIN_HEALTH_SCORE } from '../scoring';
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
          jenkinsVersion: '2.580.2',
          timestamp: '2026-10-01T12:00:00Z',
        },
      ],
    };

    const score = calculateHealthScore(plugin);
    expect(score).toBe(100);

    const insight = getPluginInsight(plugin);
    expect(insight.actionInsight.severity).toBe('success');
    expect(insight.checklist.every(c => c.value)).toBe(true);
  });

  it('preserves 5-100 score bounds and handles plugins with empty migrations safely', () => {
    const emptyPlugin: PluginData = {
      pluginName: 'empty',
      pluginRepository: 'https://github.com/jenkinsci/empty-plugin',
      migrations: [],
    };

    expect(calculateHealthScore(emptyPlugin)).toBe(MIN_HEALTH_SCORE);
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
          jenkinsVersion: '2.580.2',
          timestamp: '2026-10-01T12:00:00Z',
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

  it('does not trigger remediation commands for unrecorded or unknown telemetry', () => {
    const commands = getRemediationCommands(
      [
        { label: 'BOM Aligned', value: false, status: 'unknown', description: '' },
        { label: 'Latest Parent POM', value: false, status: 'unknown', description: '' },
      ],
      'plugin-sample'
    );

    // Should NOT suggest recipes when there is no confirmed failure
    expect(commands[0]).toContain('No explicit failures detected. Telemetry partially reported.');
  });

  it('handles case-insensitive check runs and draft pull requests', () => {
    const pluginWithUpperAndDraft: PluginData = {
      pluginName: 'draft-test',
      pluginRepository: '',
      migrations: [
        {
          migrationName: 'Setup',
          migrationStatus: 'SUCCESS',
          pullRequestStatus: 'DRAFT',
          pullRequestUrl: 'https://github.com/pull/5',
          tags: [],
          checkRuns: {
            'Security Scan': 'SUCCESS', // Uppercase
            'BOM': 'SUCCESS',
          },
          jenkinsVersion: '2.580.2',
          timestamp: '2026-10-01T00:00:00Z',
        },
      ],
    };

    const insight = getPluginInsight(pluginWithUpperAndDraft);
    expect(insight.priorities.security.status).toBe('Secured');
    expect(insight.priorities.maintenance.status).toBe('Draft PR');
    expect(insight.issueBreakdown.pr.display).toBe('DRAFT PR');
  });

  it('refuses to generate commands for unsafe plugin names and accepts valid ones', () => {
    const unsafeCommands = getRemediationCommands(
      [
        { label: 'CI Configured', value: false, status: 'failed', description: '' },
      ],
      'plugin-with-special;rm -rf /'
    );

    expect(unsafeCommands[0]).toContain('[SECURITY ADVISORY] Refusing to generate remediation commands');
    expect(unsafeCommands.some(c => c.includes('rm -rf'))).toBe(false);
    expect(unsafeCommands.some(c => c.includes('--repo'))).toBe(false);

    const safeCommands = getRemediationCommands(
      [
        { label: 'CI Configured', value: false, status: 'failed', description: '' },
      ],
      'git-plugin'
    );

    expect(safeCommands.some(c => c.includes('--repo jenkins-plugins/git-plugin'))).toBe(true);
  });

  it('detects vulnerabilities across multiple security and CVE checks', () => {
    const pluginWithMultipleSecChecks: PluginData = {
      pluginName: 'sec-test',
      pluginRepository: '',
      migrations: [
        {
          migrationName: 'Sec',
          migrationStatus: 'SUCCESS',
          pullRequestStatus: 'OPEN',
          pullRequestUrl: '',
          tags: [],
          checkRuns: {
            'Jenkins Security Scan': 'success',
            'CVE Vulnerability Audit': 'failure', // One of multiple checks failed
          },
          jenkinsVersion: '2.580.2',
          timestamp: '2026-10-01T00:00:00Z',
        },
      ],
    };

    const insight = getPluginInsight(pluginWithMultipleSecChecks);
    // Must flag Vulnerabilities because CVE Audit failed, despite Jenkins Security Scan passing
    expect(insight.priorities.security.status).toBe('Vulnerabilities');
    expect(insight.actionInsight.severity).toBe('danger');
  });

  it('marks Secured only when all security and CVE checks pass', () => {
    const securedPlugin: PluginData = {
      pluginName: 'all-sec-passed',
      pluginRepository: '',
      migrations: [
        {
          migrationName: 'Sec',
          migrationStatus: 'SUCCESS',
          pullRequestStatus: 'MERGED',
          pullRequestUrl: '',
          tags: [],
          checkRuns: {
            'Jenkins Security Scan': 'success',
            'CVE Audit': 'success',
          },
          jenkinsVersion: '2.580.2',
          timestamp: '2026-10-01T00:00:00Z',
        },
      ],
    };

    const insight = getPluginInsight(securedPlugin);
    expect(insight.priorities.security.status).toBe('Secured');
  });
});
