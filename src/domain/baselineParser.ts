import type { BaselineDrift, Migration } from './types';

export const MINIMUM_SUPPORTED_BASELINE = '2.440.3';
export const LTS_BASELINE = '2.580.2';
export const OUTDATED_MINOR_THRESHOLD = 440;
export const BASELINE_WARNING_MINOR_THRESHOLD = 580;

export const BASELINE_METADATA = {
  ltsVersion: LTS_BASELINE,
  minimumSupportedVersion: MINIMUM_SUPPORTED_BASELINE,
  ltsReleaseDate: 'October 2026',
  source: 'https://www.jenkins.io/changelog-lts/',
};

export type BaselineBucket = "critical" | "warning" | "aligned" | "unspecified";
export type BaselineFilterToken = "BASELINE_CRITICAL" | "BASELINE_WARNING" | "BASELINE_ALIGNED" | "BASELINE_UNSPECIFIED";

export const BASELINE_BUCKET_META: Record<BaselineBucket, {
  label: string;
  token: BaselineFilterToken;
  insight: string;
  severity: "danger" | "warning" | "success" | "neutral";
}> = {
  critical: {
    label: "Critical Legacy (<2.440)",
    token: "BASELINE_CRITICAL",
    insight: "Plugins in this segment are behind the minimum supported modernization threshold (< 2.440) and need immediate baseline upgrades.",
    severity: "danger"
  },
  warning: {
    label: "Needs LTS Upgrade (2.440-2.579)",
    token: "BASELINE_WARNING",
    insight: "Plugins here meet the minimum runtime baseline but remain behind current 2026 LTS compatibility (2.580.2).",
    severity: "warning"
  },
  aligned: {
    label: "Aligned (>=2.580)",
    token: "BASELINE_ALIGNED",
    insight: "Plugins in this segment are aligned with current Jenkins LTS baseline expectations (>= 2.580.2).",
    severity: "success"
  },
  unspecified: {
    label: "Unspecified / Missing",
    token: "BASELINE_UNSPECIFIED",
    insight: "Plugins with no reported Jenkins core version in their modernization telemetry.",
    severity: "neutral"
  }
};

export function parseBaselineMinor(version?: string): number | null {
  if (!version || typeof version !== 'string') return null;
  const trimmed = version.trim();
  if (!trimmed || trimmed === '0.0' || trimmed.toLowerCase() === 'unknown') return null;

  const [majorRaw, minorRaw] = trimmed.split(".");
  const major = Number.parseInt(majorRaw || "", 10);
  const minor = Number.parseInt(minorRaw || "", 10);
  if (Number.isNaN(major) || Number.isNaN(minor)) return null;
  if (major < 2) return 0;
  return major > 2 ? 1000 + minor : minor;
}

export function getMigrationBaselineMinor(migration?: Partial<Migration>): number | null {
  const candidates = [
    migration?.jenkinsVersion,
    migration?.effectiveBaseline,
    migration?.jenkinsBaseline,
    migration?.targetBaseline
  ];
  for (const candidate of candidates) {
    const parsed = parseBaselineMinor(candidate);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function getBaselineBucket(minor: number | null): BaselineBucket {
  if (minor === null) return "unspecified";
  if (minor < OUTDATED_MINOR_THRESHOLD) return "critical";
  if (minor < BASELINE_WARNING_MINOR_THRESHOLD) return "warning";
  return "aligned";
}

export function getBaselineBucketByToken(token: string): BaselineBucket | null {
  const entry = (Object.entries(BASELINE_BUCKET_META) as Array<[BaselineBucket, typeof BASELINE_BUCKET_META[BaselineBucket]]>)
    .find(([, meta]) => meta.token === token);
  return entry?.[0] || null;
}

export function parseJenkinsVersion(versionString?: string): { major: number; minor: number; patch: number } | null {
  if (!versionString || typeof versionString !== 'string') return null;
  const trimmed = versionString.trim();
  if (!trimmed || trimmed === '0.0' || trimmed.toLowerCase() === 'unknown') return null;

  const parts = trimmed.split('.').map(p => parseInt(p, 10));
  if (parts.length === 0 || isNaN(parts[0])) return null;

  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

export function isVersionOutdated(versionString?: string): boolean | 'unknown' {
  const parsed = parseJenkinsVersion(versionString);
  if (!parsed) return 'unknown';

  if (parsed.major < 2) return true;
  if (parsed.major === 2 && parsed.minor < OUTDATED_MINOR_THRESHOLD) return true;
  return false;
}

export function calculateBaselineDrift(currentVersion?: string, baseline = LTS_BASELINE): BaselineDrift {
  const parsedCurrent = parseJenkinsVersion(currentVersion);
  const parsedBaseline = parseJenkinsVersion(baseline) || { major: 2, minor: 580, patch: 2 };

  if (!parsedCurrent) {
    return {
      gap: 0,
      criticality: 'unspecified',
      currentVersion: currentVersion || 'Unspecified',
      baselineVersion: baseline,
    };
  }

  const baselineScore = parsedBaseline.major * 1000 + parsedBaseline.minor;
  const currentScore = parsedCurrent.major * 1000 + parsedCurrent.minor;
  const gap = Math.max(0, baselineScore - currentScore);

  let criticality: BaselineDrift['criticality'] = 'low';
  if (gap > 50) {
    criticality = 'critical';
  } else if (gap > 20) {
    criticality = 'med';
  }

  return {
    gap,
    criticality,
    currentVersion: currentVersion || 'Unspecified',
    baselineVersion: baseline,
  };
}
