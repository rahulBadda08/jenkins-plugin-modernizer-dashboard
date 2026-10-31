export type MigrationStatus =
  | "SUCCESS"
  | "FAILURE"
  | "PENDING"
  | "RUNNING"
  | "ABORTED"
  | "UNKNOWN";

export type PRStatus = "MERGED" | "OPEN" | "CLOSED" | "DRAFT" | "UNKNOWN";

export interface Migration {
  migrationName: string;
  migrationStatus: MigrationStatus;
  pullRequestStatus: PRStatus;
  pullRequestUrl: string;
  tags: string[];
  checkRuns?: Record<string, string | null>;
  checkRunsSummary?: string;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  pluginVersion?: string;
  jenkinsVersion?: string;
  jenkinsBaseline?: string;
  timestamp: string;
  key?: string;
  migrationDescription?: string;
  migrationId?: string;
  targetBaseline?: string;
  effectiveBaseline?: string;
}

export interface PluginData {
  pluginName: string;
  pluginRepository: string;
  migrations: Migration[];
}

export interface BaselineDrift {
  gap: number;
  criticality: 'low' | 'med' | 'critical' | 'unspecified';
  currentVersion: string;
  baselineVersion: string;
}

export interface ChecklistItem {
  label: string;
  value: boolean;
  status: 'passed' | 'failed' | 'unknown';
  description: string;
}

export interface PriorityItem {
  label: string;
  status: string;
  color: string;
}

export interface PluginInsight {
  actionInsight: {
    status: string;
    severity: 'danger' | 'warning' | 'success' | 'info';
    summary: string[];
    recommendations: string[];
  };
  priorities: {
    severity: PriorityItem;
    maintenance: PriorityItem;
    security: PriorityItem;
  };
  checklist: ChecklistItem[];
  issueBreakdown: {
    deprecated: { label: string; value: boolean; display: string };
    ci: { label: string; value: boolean; display: string };
    pr: { label: string; value: boolean; display: string };
  };
  surgical: {
    drift: BaselineDrift;
    commands: string[];
    difficulty: number;
  };
}

export interface EnrichedPlugin extends PluginData {
  activeMigration: Migration | null;
  insight: PluginInsight;
  healthScore: number;
}
