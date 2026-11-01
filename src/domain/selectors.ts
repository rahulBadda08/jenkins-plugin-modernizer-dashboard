import type { EnrichedPlugin } from './types';
import {
  getBaselineBucket,
  getBaselineBucketByToken,
  getMigrationBaselineVersion,
  isVersionOutdated,
} from './baselineParser';

export interface FilterOptions {
  globalSearch?: string;
  searchTerm?: string;
  topicFilter?: string;
  statusFilter?: string;
  prFilter?: string;
  severityFilter?: string;
  roadmapList?: string[];
  legacyAlignmentNames?: string[];
}

export interface WorkbenchMetrics {
  totalCount: number;
  filteredCount: number;
  modernizedPercentage: number;
  legacyAlignmentPercentage: number;
  legacyAlignmentNames: string[];
  mainRiskArea: string;
  roadmapList: string[];
}

export function filterPlugins(plugins: EnrichedPlugin[], options: FilterOptions): EnrichedPlugin[] {
  const { globalSearch, searchTerm, topicFilter, statusFilter, prFilter, severityFilter, roadmapList, legacyAlignmentNames } = options;
  const term = (globalSearch || searchTerm || '').trim();

  return plugins.filter((plugin) => {
    const migration = plugin.activeMigration;
    if (!migration) return false;

    // 1. Global Search & Strategic Token Matching
    if (term) {
      if (term === 'ROADMAP_TOP_20') {
        const matchesRoadmap = roadmapList?.includes(plugin.pluginName) || false;
        if (!matchesRoadmap) return false;
      } else if (term === 'LEGACY_BASELINE') {
        const matchesLegacy = legacyAlignmentNames?.includes(plugin.pluginName) || false;
        if (!matchesLegacy) return false;
      } else if (term.startsWith('BASELINE_')) {
        const targetBucket = getBaselineBucketByToken(term);
        const pluginBucket = getBaselineBucket(migration);
        const matchesBucket = !!targetBucket && pluginBucket === targetBucket;
        if (!matchesBucket) return false;
      } else {
        const lowerTerm = term.toLowerCase();
        const matchName = plugin.pluginName.toLowerCase().includes(lowerTerm);
        const matchRepo = plugin.pluginRepository.toLowerCase().includes(lowerTerm);
        const matchTags = (migration.tags || []).some(t => t.toLowerCase().includes(lowerTerm));
        if (!matchName && !matchRepo && !matchTags) return false;
      }
    }

    // 2. Topic Match
    if (topicFilter && topicFilter !== 'ALL') {
      const matchTopic = (migration.tags || []).some(
        t => t.toLowerCase() === topicFilter.toLowerCase()
      );
      if (!matchTopic) return false;
    }

    // 3. Status Match
    if (statusFilter && statusFilter !== 'ALL') {
      const status = (migration.migrationStatus || 'UNKNOWN').toUpperCase();
      if (status !== statusFilter.toUpperCase()) return false;
    }

    // 4. PR Match
    if (prFilter && prFilter !== 'ALL') {
      let prStatus = (migration.pullRequestStatus || 'UNKNOWN').toUpperCase();
      if (prStatus === 'FAILURE') prStatus = 'FAIL';
      if (prStatus !== prFilter.toUpperCase()) return false;
    }

    // 5. Severity Match
    if (severityFilter && severityFilter !== 'ALL') {
      const severity = (plugin.insight?.actionInsight?.severity || '').toUpperCase();
      if (severityFilter === 'CRITICAL' && severity !== 'DANGER') return false;
      if (severityFilter === 'WARNING' && severity !== 'WARNING') return false;
      if (severityFilter === 'OPTIMIZED' && severity !== 'SUCCESS') return false;
      if (severityFilter !== 'CRITICAL' && severityFilter !== 'WARNING' && severityFilter !== 'OPTIMIZED') {
        if (severity !== severityFilter.toUpperCase()) return false;
      }
    }

    return true;
  });
}

export function computeWorkbenchMetrics(
  plugins: EnrichedPlugin[],
  totalEcosystemCount: number,
  options: {
    topicFilter?: string;
    prFilter?: string;
    severityFilter?: string;
  } = {}
): WorkbenchMetrics {
  const { topicFilter = 'ALL', prFilter = 'ALL', severityFilter = 'ALL' } = options;

  const baseList = plugins.filter(p => {
    const migration = p.activeMigration;
    if (!migration) return false;

    // 1. Topic Match
    if (topicFilter && topicFilter !== 'ALL') {
      const matchTopic = (migration.tags || []).some(
        t => t.toLowerCase() === topicFilter.toLowerCase()
      );
      if (!matchTopic) return false;
    }

    // 2. PR Match
    if (prFilter && prFilter !== 'ALL') {
      let prStatus = (migration.pullRequestStatus || 'UNKNOWN').toUpperCase();
      if (prStatus === 'FAILURE') prStatus = 'FAIL';
      if (prStatus !== prFilter.toUpperCase()) return false;
    }

    // 3. Severity Match
    if (severityFilter && severityFilter !== 'ALL') {
      const severity = (p.insight?.actionInsight?.severity || '').toUpperCase();
      if (severityFilter === 'CRITICAL' && severity !== 'DANGER') return false;
      if (severityFilter === 'WARNING' && severity !== 'WARNING') return false;
      if (severityFilter === 'OPTIMIZED' && severity !== 'SUCCESS') return false;
      if (severityFilter !== 'CRITICAL' && severityFilter !== 'WARNING' && severityFilter !== 'OPTIMIZED') {
        if (severity !== severityFilter.toUpperCase()) return false;
      }
    }

    return true;
  });

  const outdatedPlugins = baseList.filter(p => {
    const ver = getMigrationBaselineVersion(p.activeMigration);
    return isVersionOutdated(ver || undefined) === true;
  });

  const failedPlugins = baseList.filter(p => {
    const status = (p.activeMigration.migrationStatus || '').toLowerCase();
    return status === 'fail' || status === 'failure';
  });

  const failureTags: Record<string, number> = {};
  failedPlugins.forEach(p => {
    (p.activeMigration.tags || []).forEach(t => {
      failureTags[t] = (failureTags[t] || 0) + 1;
    });
  });
  const topRiskArea = Object.entries(failureTags).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mainRiskArea = topRiskArea || 'General Infrastructure';

  const roadmapList = [...baseList]
    .sort((a, b) => {
      const migA = a.activeMigration;
      const migB = b.activeMigration;
      const intensityA = (migA.additions || 0) + (migA.deletions || 0);
      const intensityB = (migB.additions || 0) + (migB.deletions || 0);
      return intensityB - intensityA;
    })
    .slice(0, 20)
    .map(p => p.pluginName);

  const modernizedPlugins = baseList.filter(p => {
    const status = (p.activeMigration.migrationStatus || '').toLowerCase();
    return status === 'success';
  });

  return {
    totalCount: totalEcosystemCount,
    filteredCount: baseList.length,
    modernizedPercentage: baseList.length > 0 ? Math.round((modernizedPlugins.length / baseList.length) * 100) : 0,
    legacyAlignmentPercentage: baseList.length > 0 ? Math.round((outdatedPlugins.length / baseList.length) * 100) : 0,
    legacyAlignmentNames: outdatedPlugins.map(p => p.pluginName),
    mainRiskArea,
    roadmapList,
  };
}
