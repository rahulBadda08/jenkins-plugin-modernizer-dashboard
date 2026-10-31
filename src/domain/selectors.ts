import type { EnrichedPlugin } from './types';

export interface FilterOptions {
  searchTerm?: string;
  topicFilter?: string;
  statusFilter?: string;
  prFilter?: string;
  severityFilter?: string;
}

export function filterPlugins(plugins: EnrichedPlugin[], options: FilterOptions): EnrichedPlugin[] {
  const { searchTerm, topicFilter, statusFilter, prFilter, severityFilter } = options;
  const term = (searchTerm || '').trim().toLowerCase();

  return plugins.filter((plugin) => {
    // 1. Search term match
    if (term) {
      const matchName = plugin.pluginName.toLowerCase().includes(term);
      const matchRepo = plugin.pluginRepository.toLowerCase().includes(term);
      const matchTags = (plugin.activeMigration?.tags || []).some(t => t.toLowerCase().includes(term));
      if (!matchName && !matchRepo && !matchTags) return false;
    }

    // 2. Topic match
    if (topicFilter && topicFilter !== 'ALL') {
      const matchTopic = (plugin.activeMigration?.tags || []).some(
        t => t.toLowerCase() === topicFilter.toLowerCase()
      );
      if (!matchTopic) return false;
    }

    // 3. Status match
    if (statusFilter && statusFilter !== 'ALL') {
      const status = (plugin.activeMigration?.migrationStatus || 'UNKNOWN').toUpperCase();
      if (status !== statusFilter.toUpperCase()) return false;
    }

    // 4. PR status match
    if (prFilter && prFilter !== 'ALL') {
      const prStatus = (plugin.activeMigration?.pullRequestStatus || 'UNKNOWN').toUpperCase();
      if (prStatus !== prFilter.toUpperCase()) return false;
    }

    // 5. Severity match
    if (severityFilter && severityFilter !== 'ALL') {
      const severity = plugin.insight.actionInsight.severity.toUpperCase();
      if (severity !== severityFilter.toUpperCase()) return false;
    }

    return true;
  });
}
