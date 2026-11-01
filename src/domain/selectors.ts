import type { EnrichedPlugin } from './types';
import { getBaselineBucket, getBaselineBucketByToken, getMigrationBaselineMinor } from './baselineParser';

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

export function filterPlugins(plugins: EnrichedPlugin[], options: FilterOptions): EnrichedPlugin[] {
  const { globalSearch, searchTerm, topicFilter, statusFilter, prFilter, severityFilter, roadmapList, legacyAlignmentNames } = options;
  const term = (globalSearch || searchTerm || '').trim();

  return plugins.filter((plugin) => {
    const migration = plugin.activeMigration || plugin.migrations[0];
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
        const pluginBucket = getBaselineBucket(getMigrationBaselineMinor(migration));
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
