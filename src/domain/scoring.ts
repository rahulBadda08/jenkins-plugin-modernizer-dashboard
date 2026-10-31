import type { PluginData, PluginInsight, PriorityItem, ChecklistItem } from './types';
import { selectActiveMigration } from './migrationPolicy';
import { calculateBaselineDrift, isVersionOutdated } from './baselineParser';
import { sanitizeShellArg } from './security';

export function calculateHealthScore(plugin: PluginData): number {
  const migration = selectActiveMigration(plugin.migrations);
  if (!migration) return 0;

  let score = 100;
  const status = migration.migrationStatus.toLowerCase();
  const prStatus = migration.pullRequestStatus.toLowerCase();
  const checkRuns = migration.checkRuns || {};
  const summary = (migration.checkRunsSummary || '').toLowerCase();

  // 1. Migration Execution Outcome
  if (status === 'failure') score -= 30;
  else if (status === 'aborted') score -= 20;
  else if (status === 'pending' || status === 'running') score -= 10;
  else if (status === 'unknown') score -= 5;

  // 2. Automated CI Validation (Distinguish failure from unknown/unreported)
  if (summary === 'failure' || summary === 'fail') {
    score -= 25;
  } else if (!summary || summary === 'unknown') {
    // Unreported telemetry is not penalized as catastrophic failure
    score -= 5;
  }

  // 3. Deprecation and Architecture Alignment
  const hasDeprecated = (migration.tags || []).some(t => t.toLowerCase() === 'deprecated');
  if (hasDeprecated) score -= 20;

  const bomStatus = (checkRuns['BOM'] || checkRuns['Bom'] || '').toLowerCase();
  if (bomStatus === 'failure') {
    score -= 15;
  } else if (bomStatus !== 'success') {
    score -= 5;
  }

  // 4. Maintenance / PR Status
  if (prStatus === 'closed') {
    score -= 15;
  } else if (prStatus === 'unknown') {
    score -= 5;
  }

  // 5. Baseline Version Checks
  const outdated = isVersionOutdated(migration.jenkinsVersion);
  if (outdated === true) {
    score -= 20;
  } else if (outdated === 'unknown') {
    score -= 5;
  }

  return Math.max(5, Math.min(100, score));
}

export function getRemediationCommands(checklist: ChecklistItem[], pluginName: string): string[] {
  const commands: string[] = [];
  const safePluginName = sanitizeShellArg(pluginName, 'plugin');
  const fails = checklist.filter(c => c.status === 'failed' || !c.value);

  if (fails.some(f => f.label.includes('BOM'))) {
    commands.push(`mvn jenkins-plugin-modernizer:modernize -Drecipe=BomAlignment`);
  }
  if (fails.some(f => f.label.includes('Parent'))) {
    commands.push(`mvn versions:update-parent -DparentVersion=5.12`);
  }
  if (fails.some(f => f.label.includes('CI'))) {
    commands.push(`gh workflow run modernization.yml --repo jenkins-plugins/${safePluginName}`);
  }
  if (fails.some(f => f.label.includes('API'))) {
    commands.push(`mvn rewrite:run -DactiveRecipes=org.openrewrite.jenkins.ModernizePlugin`);
  }

  if (commands.length === 0) {
    commands.push('# No immediate technical remediation required. Baseline aligned.');
  }
  return commands;
}

export function getPluginInsight(plugin: PluginData): PluginInsight {
  const migration = selectActiveMigration(plugin.migrations) || {
    migrationName: 'None',
    migrationStatus: 'UNKNOWN',
    pullRequestStatus: 'UNKNOWN',
    pullRequestUrl: '',
    tags: [],
    timestamp: '',
  };

  const checkRuns = migration.checkRuns || {};
  const checkRunKeys = Object.keys(checkRuns);
  const status = migration.migrationStatus.toLowerCase();
  const prStatus = migration.pullRequestStatus.toLowerCase();
  const ver = migration.jenkinsVersion;
  const summary = (migration.checkRunsSummary || '').toLowerCase();

  const isOutdated = isVersionOutdated(ver) === true;
  const hasSecurityRisk = checkRunKeys.some(k => k.toLowerCase().includes('security')) &&
    checkRuns[checkRunKeys.find(k => k.toLowerCase().includes('security'))!] !== 'success';
  const hasCiFailure = summary === 'failure' || summary === 'fail';
  const hasNoPR = prStatus === 'unknown' || prStatus === '';

  // Checklist
  const bomRun = (checkRuns['BOM'] || checkRuns['Bom'] || '').toLowerCase();
  const parentPomRun = (checkRuns['Parent Pom'] || checkRuns['Parent POM'] || '').toLowerCase();

  const checklist: ChecklistItem[] = [
    {
      label: 'BOM Aligned',
      value: bomRun === 'success',
      status: bomRun === 'success' ? 'passed' : bomRun === 'failure' ? 'failed' : 'unknown',
      description: 'Bill of Materials dependency management',
    },
    {
      label: 'Latest Parent POM',
      value: parentPomRun === 'success',
      status: parentPomRun === 'success' ? 'passed' : parentPomRun === 'failure' ? 'failed' : 'unknown',
      description: 'Modern Jenkins build configuration',
    },
    {
      label: 'CI Configured',
      value: summary === 'success',
      status: summary === 'success' ? 'passed' : hasCiFailure ? 'failed' : 'unknown',
      description: 'Automated verification & passing tests',
    },
    {
      label: 'Active Maintenance',
      value: !hasNoPR && prStatus !== 'closed',
      status: (!hasNoPR && prStatus !== 'closed') ? 'passed' : hasNoPR ? 'unknown' : 'failed',
      description: 'Recent Pull Request activity & review',
    },
  ];

  // Priorities
  const prioritySeverity: PriorityItem = {
    label: 'Migration Status',
    status: status === 'success' ? 'Passing' : status === 'failure' ? 'Failed' : status === 'unknown' ? 'Unknown' : 'Pending',
    color: status === 'success' ? '#10B981' : status === 'failure' ? '#EF4444' : '#F59E0B',
  };

  const priorityMaintenance: PriorityItem = {
    label: 'Maintenance',
    status: prStatus === 'merged' ? 'Modernized' : prStatus === 'open' ? 'In Review' : prStatus === 'unknown' ? 'Unreported' : 'Closed',
    color: prStatus === 'merged' ? '#10B981' : prStatus === 'open' ? '#3B82F6' : prStatus === 'unknown' ? '#94A3B8' : '#F59E0B',
  };

  const prioritySecurity: PriorityItem = {
    label: 'Security & Core',
    status: hasSecurityRisk ? 'Vulnerabilities' : isOutdated ? 'Outdated Core' : 'Secured',
    color: hasSecurityRisk ? '#EF4444' : isOutdated ? '#F59E0B' : '#10B981',
  };

  // Action Insight
  let actionSeverity: 'danger' | 'warning' | 'success' | 'info' = 'info';
  let actionStatus = 'Modernization Queued';
  const actionSummary: string[] = [];
  const actionRecommendations: string[] = [];

  if (status === 'failure' || hasSecurityRisk || hasCiFailure) {
    actionSeverity = 'danger';
    actionStatus = 'Requires Immediate Attention';
    if (hasSecurityRisk) actionSummary.push('Security scan flagged compliance or vulnerability violations.');
    if (hasCiFailure) actionSummary.push('Automated CI test execution failed regression verification.');
    if (status === 'failure') actionSummary.push('Modernization recipe execution encountered errors.');
    actionRecommendations.push('Inspect automated build failure logs and resolve test regressions.');
  } else if (isOutdated || prStatus === 'closed' || status === 'aborted') {
    actionSeverity = 'warning';
    actionStatus = 'Action Recommended';
    if (isOutdated) actionSummary.push(`Jenkins baseline (${ver || 'unknown'}) is below modern LTS standards.`);
    if (prStatus === 'closed') actionSummary.push('Modernization pull request was closed without merging.');
    actionRecommendations.push('Align plugin parent POM and BOM with modern Jenkins baseline.');
  } else if (status === 'success') {
    actionSeverity = 'success';
    actionStatus = 'Ecosystem Standard Aligned';
    actionSummary.push('Plugin has successfully adopted modern Jenkins infrastructure standards.');
    actionRecommendations.push('Monitor automated dependency updates to stay on the LTS track.');
  } else {
    actionSeverity = 'info';
    actionStatus = 'Telemetry Pending';
    actionSummary.push('Modernization data is queued or pending automated reporting.');
    actionRecommendations.push('Run local modernization verification using the Jenkins CLI tool.');
  }

  const drift = calculateBaselineDrift(ver);
  const commands = getRemediationCommands(checklist, plugin.pluginName);

  return {
    actionInsight: {
      status: actionStatus,
      severity: actionSeverity,
      summary: actionSummary,
      recommendations: actionRecommendations,
    },
    priorities: {
      severity: prioritySeverity,
      maintenance: priorityMaintenance,
      security: prioritySecurity,
    },
    checklist,
    issueBreakdown: {
      deprecated: {
        label: 'Deprecated API',
        value: (migration.tags || []).some(t => t.toLowerCase() === 'deprecated'),
        display: (migration.tags || []).some(t => t.toLowerCase() === 'deprecated') ? 'FLAGGED' : 'CLEAR',
      },
      ci: {
        label: 'CI Integrity',
        value: summary === 'success',
        display: summary === 'success' ? 'CONFIGURED' : summary === '' ? 'UNKNOWN' : 'FAILING',
      },
      pr: {
        label: 'Maintenance',
        value: !hasNoPR && prStatus !== 'closed',
        display: prStatus === 'merged' ? 'MERGED' : prStatus === 'open' ? 'OPEN PR' : prStatus === 'unknown' ? 'NO PR' : 'CLOSED',
      },
    },
    surgical: {
      drift,
      commands,
      difficulty: drift.gap > 50 ? 3 : drift.gap > 20 ? 2 : 1,
    },
  };
}
