import type { BaselineDrift, Migration } from './types';

export const MINIMUM_SUPPORTED_BASELINE = '2.440.3';
export const LTS_BASELINE = '2.580.2';
export const OUTDATED_MINOR_THRESHOLD = 440;
export const BASELINE_WARNING_MINOR_THRESHOLD = 580;

export interface JenkinsVersion {
  major: number;
  minor: number;
  patch: number;
}

export const PARSED_MINIMUM_SUPPORTED: JenkinsVersion = { major: 2, minor: 440, patch: 3 };
export const PARSED_LTS: JenkinsVersion = { major: 2, minor: 580, patch: 2 };

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
    label: "Critical Legacy (<2.440.3)",
    token: "BASELINE_CRITICAL",
    insight: "Plugins in this segment are behind the minimum supported modernization threshold (< 2.440.3) and need immediate baseline upgrades.",
    severity: "danger"
  },
  warning: {
    label: "Needs LTS Upgrade (2.440.3-2.580.1)",
    token: "BASELINE_WARNING",
    insight: "Plugins here meet the minimum runtime baseline but remain behind current 2026 LTS compatibility (2.580.2).",
    severity: "warning"
  },
  aligned: {
    label: "Aligned (>=2.580.2)",
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

export function parseJenkinsVersion(versionString?: string): JenkinsVersion | null {
  if (!versionString || typeof versionString !== 'string') return null;
  const trimmed = versionString.trim();
  if (!trimmed || trimmed === '0.0' || trimmed.toLowerCase() === 'unknown') return null;

  const parts = trimmed.split('.').map(p => {
    const n = Number.parseInt(p, 10);
    return Number.isNaN(n) ? 0 : n;
  });
  if (parts.length === 0 || Number.isNaN(parts[0])) return null;

  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

export function compareJenkinsVersions(a: JenkinsVersion, b: JenkinsVersion): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

export function parseBaselineMinor(version?: string): number | null {
  if (!version || typeof version !== 'string') return null;
  const parsed = parseJenkinsVersion(version);
  if (!parsed) return null;
  if (parsed.major < 2) return 0;
  return parsed.major > 2 ? 1000 + parsed.minor : parsed.minor;
}

export function getMigrationBaselineVersion(migration?: Partial<Migration>): string | null {
  const candidates = [
    migration?.jenkinsVersion,
    migration?.effectiveBaseline,
    migration?.jenkinsBaseline,
    migration?.targetBaseline
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed && trimmed !== '0.0' && trimmed.toLowerCase() !== 'unknown') {
        return trimmed;
      }
    }
  }
  return null;
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

export function getBaselineBucketForVersion(version?: string | JenkinsVersion | null): BaselineBucket {
  if (!version) return "unspecified";
  const parsed = typeof version === 'string' ? parseJenkinsVersion(version) : version;
  if (!parsed) return "unspecified";

  if (compareJenkinsVersions(parsed, PARSED_MINIMUM_SUPPORTED) < 0) {
    return "critical";
  }
  if (compareJenkinsVersions(parsed, PARSED_LTS) < 0) {
    return "warning";
  }
  return "aligned";
}

export function getBaselineBucket(input: number | string | Partial<Migration> | null | undefined): BaselineBucket {
  if (input === null || input === undefined) return "unspecified";

  // If a number (minor version number) is supplied
  if (typeof input === 'number') {
    if (input < OUTDATED_MINOR_THRESHOLD) return "critical";
    if (input < BASELINE_WARNING_MINOR_THRESHOLD) return "warning";
    return "aligned";
  }

  // If a string (version string) is supplied
  if (typeof input === 'string') {
    return getBaselineBucketForVersion(input);
  }

  // If a migration object is supplied
  const versionStr = getMigrationBaselineVersion(input);
  if (versionStr) {
    return getBaselineBucketForVersion(versionStr);
  }
  const minor = getMigrationBaselineMinor(input);
  if (minor !== null) {
    return getBaselineBucket(minor);
  }
  return "unspecified";
}

export function getBaselineBucketByToken(token: string): BaselineBucket | null {
  const entry = (Object.entries(BASELINE_BUCKET_META) as Array<[BaselineBucket, typeof BASELINE_BUCKET_META[BaselineBucket]]>)
    .find(([, meta]) => meta.token === token);
  return entry?.[0] || null;
}

export function isVersionOutdated(versionString?: string): boolean | 'unknown' {
  const parsed = parseJenkinsVersion(versionString);
  if (!parsed) return 'unknown';

  return compareJenkinsVersions(parsed, PARSED_MINIMUM_SUPPORTED) < 0;
}

export function calculateBaselineDrift(currentVersion?: string, baseline = LTS_BASELINE): BaselineDrift {
  const parsedCurrent = parseJenkinsVersion(currentVersion);
  const parsedBaseline = parseJenkinsVersion(baseline) || PARSED_LTS;

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
  if (compareJenkinsVersions(parsedCurrent, PARSED_MINIMUM_SUPPORTED) < 0 || gap > 50) {
    criticality = 'critical';
  } else if (compareJenkinsVersions(parsedCurrent, PARSED_LTS) < 0 || gap > 20) {
    criticality = 'med';
  }

  return {
    gap,
    criticality,
    currentVersion: currentVersion || 'Unspecified',
    baselineVersion: baseline,
  };
}
