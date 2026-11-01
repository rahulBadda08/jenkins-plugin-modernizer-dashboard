import type { PluginData, PluginInsight, PriorityItem, ChecklistItem } from './types';
import { selectActiveMigration } from './migrationPolicy';
import { calculateBaselineDrift, isVersionOutdated, getMigrationBaselineVersion } from './baselineParser';
import { isSafeShellArg, parseGitHubRepo } from './security';
import { classifyAllChecks, classifyBOM, classifyParentPom, classifyCI } from './checkClassification';

export const SCORING_PENALTIES = {
  MIGRATION_FAILURE: 30,
  MIGRATION_ABORTED: 20,
  MIGRATION_PENDING_RUNNING: 10,
  MIGRATION_UNKNOWN: 5,
  CI_EXPLICIT_FAILURE: 25,
  CI_UNREPORTED: 5,
  DEPRECATED_TAG: 20,
  BOM_EXPLICIT_FAILURE: 15,
  BOM_UNREPORTED_OR_UNALIGNED: 5,
  PARENT_POM_FAILURE: 10,
  PARENT_POM_UNREPORTED: 0,
  SECURITY_RISK: 25,
  PR_CLOSED_UNMERGED: 15,
  PR_UNREPORTED: 5,
  BASELINE_OUTDATED: 20,
  BASELINE_UNKNOWN: 5,
} as const;

export const MIN_HEALTH_SCORE = 5;
export const MAX_HEALTH_SCORE = 100;
export const UNSCORED_HEALTH_SCORE = 0;

export function calculateHealthScore(plugin: PluginData): number {
  const migration = selectActiveMigration(plugin.migrations);
  if (!migration) return MIN_HEALTH_SCORE;

  let score = MAX_HEALTH_SCORE;
  const status = (migration.migrationStatus || '').toLowerCase();
  const prStatus = (migration.pullRequestStatus || '').toLowerCase();
  const checkRuns = migration.checkRuns || {};
  const summary = (migration.checkRunsSummary || '').toLowerCase();

  // 1. Migration Execution Outcome
  if (status === 'failure' || status === 'fail') score -= SCORING_PENALTIES.MIGRATION_FAILURE;
  else if (status === 'aborted') score -= SCORING_PENALTIES.MIGRATION_ABORTED;
  else if (status === 'pending' || status === 'running') score -= SCORING_PENALTIES.MIGRATION_PENDING_RUNNING;
  else if (status === 'unknown') score -= SCORING_PENALTIES.MIGRATION_UNKNOWN;

  // 2. Automated CI Validation (Unified check classification)
  const ciResult = classifyCI(summary, checkRuns);
  if (ciResult.status === 'failed') {
    score -= SCORING_PENALTIES.CI_EXPLICIT_FAILURE;
  } else if (ciResult.status !== 'passed') {
    score -= SCORING_PENALTIES.CI_UNREPORTED;
  }

  // 3. Deprecation and Architecture Alignment
  const hasDeprecated = (migration.tags || []).some(t => t.toLowerCase() === 'deprecated');
  if (hasDeprecated) score -= SCORING_PENALTIES.DEPRECATED_TAG;

  const bomResult = classifyBOM(checkRuns);
  if (bomResult.status === 'failed') {
    score -= SCORING_PENALTIES.BOM_EXPLICIT_FAILURE;
  } else if (bomResult.status !== 'passed') {
    score -= SCORING_PENALTIES.BOM_UNREPORTED_OR_UNALIGNED;
  }

  const parentPomResult = classifyParentPom(checkRuns);
  if (parentPomResult.status === 'failed') {
    score -= SCORING_PENALTIES.PARENT_POM_FAILURE;
  } else if (parentPomResult.status !== 'passed' && parentPomResult.status !== 'unreported') {
    score -= SCORING_PENALTIES.PARENT_POM_UNREPORTED;
  }

  // 4. Maintenance / PR Status
  if (prStatus === 'closed') {
    score -= SCORING_PENALTIES.PR_CLOSED_UNMERGED;
  } else if (prStatus === 'unknown' || !prStatus) {
    score -= SCORING_PENALTIES.PR_UNREPORTED;
  }

  // 5. Baseline Version Checks
  const effectiveBaseline = getMigrationBaselineVersion(migration);
  const outdated = isVersionOutdated(effectiveBaseline || undefined);
  if (outdated === true) {
    score -= SCORING_PENALTIES.BASELINE_OUTDATED;
  } else if (outdated === 'unknown') {
    score -= SCORING_PENALTIES.BASELINE_UNKNOWN;
  }

  return Math.max(MIN_HEALTH_SCORE, Math.min(MAX_HEALTH_SCORE, score));
}

export function getRemediationCommands(checklist: ChecklistItem[], pluginName: string, repositoryUrl?: string): string[] {
  // If pluginName contains unsafe characters, refuse command generation to prevent executing mutated/unintended targets
  if (!isSafeShellArg(pluginName)) {
    return [
      '# [SECURITY ADVISORY] Refusing to generate remediation commands.',
      '# An invalid or unsafe plugin identifier was supplied (must match ^[a-zA-Z0-9._-]+$).',
      '# Maintainers must verify the plugin repository manually before running CLI actions.',
    ];
  }

  const commands: string[] = [];
  const safePluginName = pluginName.trim();
  const repoTarget = repositoryUrl ? parseGitHubRepo(repositoryUrl) : null;
  const targetRepo = repoTarget ? `${repoTarget.owner}/${repoTarget.repo}` : `jenkins-plugins/${safePluginName}`;

  // Strictly target confirmed failures (never trigger commands on missing/unknown telemetry)
  const fails = checklist.filter(c => c.status === 'failed');

  if (fails.some(f => f.label.includes('BOM'))) {
    commands.push(`mvn jenkins-plugin-modernizer:modernize -Drecipe=BomAlignment`);
  }
  if (fails.some(f => f.label.includes('Parent'))) {
    commands.push(`mvn versions:update-parent -DparentVersion=5.12`);
  }
  if (fails.some(f => f.label.includes('CI'))) {
    commands.push(`gh workflow run modernization.yml --repo ${targetRepo}`);
  }
  if (fails.some(f => f.label.includes('API'))) {
    commands.push(`mvn rewrite:run -DactiveRecipes=org.openrewrite.jenkins.ModernizePlugin`);
  }

  if (commands.length === 0) {
    const hasUnknown = checklist.some(c => c.status === 'unknown');
    if (hasUnknown) {
      commands.push('# No explicit failures detected. Telemetry partially reported.');
    } else {
      commands.push('# No immediate technical remediation required. Baseline aligned.');
    }
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
  const status = (migration.migrationStatus || '').toLowerCase();
  const prStatus = (migration.pullRequestStatus || '').toLowerCase();
  const ver = getMigrationBaselineVersion(migration);
  const summary = (migration.checkRunsSummary || '').toLowerCase();

  const isOutdated = isVersionOutdated(ver || undefined) === true;

  // Centralized check run classifications
  const { bom, parentPom, ci, security } = classifyAllChecks(checkRuns, summary);

  const hasCiFailure = ci.status === 'failed';
  const hasCiSuccess = ci.status === 'passed';
  const hasNoPR = prStatus === 'unknown' || prStatus === '';
  const isDraft = prStatus === 'draft';

  const isBomPassed = bom.status === 'passed';
  const isBomFailed = bom.status === 'failed';

  const isParentPomPassed = parentPom.status === 'passed';
  const isParentPomFailed = parentPom.status === 'failed';

  const checklist: ChecklistItem[] = [
    {
      label: 'BOM Aligned',
      value: isBomPassed,
      status: isBomPassed ? 'passed' : isBomFailed ? 'failed' : 'unknown',
      description: 'Bill of Materials dependency management',
    },
    {
      label: 'Latest Parent POM',
      value: isParentPomPassed,
      status: isParentPomPassed ? 'passed' : isParentPomFailed ? 'failed' : 'unknown',
      description: 'Modern Jenkins build configuration',
    },
    {
      label: 'CI Configured',
      value: hasCiSuccess,
      status: hasCiSuccess ? 'passed' : hasCiFailure ? 'failed' : 'unknown',
      description: 'Automated verification & passing tests',
    },
    {
      label: 'Active Maintenance',
      value: prStatus === 'merged' || prStatus === 'open' || isDraft,
      status: (prStatus === 'merged' || prStatus === 'open' || isDraft) ? 'passed' : prStatus === 'closed' ? 'failed' : 'unknown',
      description: 'Recent Pull Request activity & review',
    },
  ];

  // Priorities with accurate status classification
  const prioritySeverity: PriorityItem = {
    label: 'Migration Status',
    status: status === 'success' ? 'Passing' : (status === 'failure' || status === 'fail') ? 'Failed' : status === 'unknown' ? 'Unknown' : 'Pending',
    color: status === 'success' ? '#10B981' : (status === 'failure' || status === 'fail') ? '#EF4444' : '#F59E0B',
  };

  const priorityMaintenance: PriorityItem = {
    label: 'Maintenance',
    status: prStatus === 'merged' ? 'Modernized' : prStatus === 'open' ? 'In Review' : isDraft ? 'Draft PR' : prStatus === 'unknown' ? 'Unreported' : 'Closed',
    color: prStatus === 'merged' ? '#10B981' : prStatus === 'open' ? '#3B82F6' : isDraft ? '#A855F7' : prStatus === 'unknown' ? '#94A3B8' : '#F59E0B',
  };

  const prioritySecurity: PriorityItem = {
    label: 'Security & Core',
    status: security.hasSecurityRisk
      ? 'Vulnerabilities'
      : security.isSecurityPassed
      ? 'Secured'
      : isOutdated
      ? 'Outdated Core'
      : security.entries.length > 0
      ? 'Scan Pending'
      : 'Not Reported',
    color: security.hasSecurityRisk
      ? '#EF4444'
      : security.isSecurityPassed
      ? '#10B981'
      : isOutdated
      ? '#F59E0B'
      : '#94A3B8',
  };

  // Action Insight
  let actionSeverity: 'danger' | 'warning' | 'success' | 'info' = 'info';
  let actionStatus = 'Modernization Queued';
  const actionSummary: string[] = [];
  const actionRecommendations: string[] = [];

  if (status === 'failure' || status === 'fail' || security.hasSecurityRisk || hasCiFailure) {
    actionSeverity = 'danger';
    actionStatus = 'Requires Immediate Attention';
    if (security.hasSecurityRisk) actionSummary.push('Security scan flagged compliance or vulnerability violations.');
    if (hasCiFailure) actionSummary.push('Automated CI test execution failed regression verification.');
    if (status === 'failure' || status === 'fail') actionSummary.push('Modernization recipe execution encountered errors.');
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

  const drift = calculateBaselineDrift(ver || undefined);
  const commands = getRemediationCommands(checklist, plugin.pluginName, plugin.pluginRepository);

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
        value: hasCiSuccess,
        display: hasCiSuccess ? 'CONFIGURED' : (ci.status === 'unreported') ? 'NOT REPORTED' : 'FAILING',
      },
      pr: {
        label: 'Maintenance',
        value: !hasNoPR && prStatus !== 'closed',
        display: prStatus === 'merged' ? 'MERGED' : prStatus === 'open' ? 'OPEN PR' : isDraft ? 'DRAFT PR' : prStatus === 'unknown' ? 'NO PR' : 'CLOSED',
      },
    },
    surgical: {
      drift,
      commands,
      difficulty: drift.gap > 50 ? 3 : drift.gap > 20 ? 2 : 1,
    },
  };
}
