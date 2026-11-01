export type CheckStatus = 'passed' | 'failed' | 'pending' | 'unknown' | 'unreported';

export interface SingleCheckResult {
  status: CheckStatus;
  key?: string;
  rawValue?: string | null;
}

export interface SecurityClassificationResult {
  status: CheckStatus;
  hasSecurityRisk: boolean;
  isSecurityPassed: boolean;
  entries: Array<{ key: string; value: string }>;
}

export interface AllChecksClassification {
  bom: SingleCheckResult;
  parentPom: SingleCheckResult;
  ci: SingleCheckResult;
  build: SingleCheckResult;
  test: SingleCheckResult;
  security: SecurityClassificationResult;
  cve: SecurityClassificationResult;
}

/**
 * Normalizes raw check value string into a unified CheckStatus enum.
 */
export function classifyCheckValue(rawValue?: string | null): CheckStatus {
  if (rawValue === undefined || rawValue === null) return 'unreported';
  const val = rawValue.trim().toLowerCase();
  if (!val || val === 'unknown') return 'unknown';
  if (['success', 'passed', 'pass', 'ok'].includes(val) || val.includes('pass') || val.includes('success')) return 'passed';
  if (['failure', 'fail', 'failed', 'error', 'action_required'].includes(val) || val.includes('fail') || val.includes('error')) return 'failed';
  if (['pending', 'queued', 'in_progress', 'running'].includes(val) || val.includes('pending') || val.includes('running')) return 'pending';
  return 'unknown';
}

/**
 * Evaluates BOM (Bill of Materials) alignment check runs.
 */
export function classifyBOM(checkRuns?: Record<string, string | null>): SingleCheckResult {
  if (!checkRuns || typeof checkRuns !== 'object') {
    return { status: 'unreported' };
  }

  for (const [key, val] of Object.entries(checkRuns)) {
    if (key.toLowerCase().includes('bom')) {
      return {
        status: classifyCheckValue(val),
        key,
        rawValue: val,
      };
    }
  }

  return { status: 'unreported' };
}

/**
 * Evaluates Parent POM modernization check runs.
 */
export function classifyParentPom(checkRuns?: Record<string, string | null>): SingleCheckResult {
  if (!checkRuns || typeof checkRuns !== 'object') {
    return { status: 'unreported' };
  }

  for (const [key, val] of Object.entries(checkRuns)) {
    if (key.toLowerCase().includes('parent')) {
      return {
        status: classifyCheckValue(val),
        key,
        rawValue: val,
      };
    }
  }

  return { status: 'unreported' };
}

/**
 * Evaluates CI automation status from summary or individual runner telemetry.
 */
export function classifyCI(summary?: string, checkRuns?: Record<string, string | null>): SingleCheckResult {
  if (summary && typeof summary === 'string' && summary.trim()) {
    const status = classifyCheckValue(summary);
    if (status !== 'unreported') {
      return { status, rawValue: summary };
    }
  }

  if (checkRuns && typeof checkRuns === 'object') {
    for (const [key, val] of Object.entries(checkRuns)) {
      const lower = key.toLowerCase();
      if (lower.includes('jenkins') || lower.includes('ci') || lower.includes('build') || lower.includes('test')) {
        return {
          status: classifyCheckValue(val),
          key,
          rawValue: val,
        };
      }
    }
  }

  return { status: 'unreported' };
}

/**
 * Evaluates security compliance and vulnerability check runs.
 */
export function classifySecurity(checkRuns?: Record<string, string | null>): SecurityClassificationResult {
  if (!checkRuns || typeof checkRuns !== 'object') {
    return {
      status: 'unreported',
      hasSecurityRisk: false,
      isSecurityPassed: false,
      entries: [],
    };
  }

  const entries: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(checkRuns)) {
    const lower = k.toLowerCase();
    if (lower.includes('security') || lower.includes('cve') || lower.includes('vulnerability')) {
      entries.push({ key: k, value: (v || '').toLowerCase() });
    }
  }

  if (entries.length === 0) {
    return {
      status: 'unreported',
      hasSecurityRisk: false,
      isSecurityPassed: false,
      entries,
    };
  }

  const hasSecurityRisk = entries.some(
    e => e.value === 'failure' || e.value === 'fail' || e.value === 'error'
  );

  const isSecurityPassed =
    !hasSecurityRisk &&
    entries.length > 0 &&
    entries.every(e => e.value === 'success' || e.value === 'pass');

  const hasPending = !hasSecurityRisk && entries.some(
    e => e.value === 'pending' || e.value === 'queued' || e.value === 'running'
  );

  const status: CheckStatus = hasSecurityRisk
    ? 'failed'
    : isSecurityPassed
    ? 'passed'
    : hasPending
    ? 'pending'
    : 'unknown';

  return {
    status,
    hasSecurityRisk,
    isSecurityPassed,
    entries,
  };
}

/**
 * Evaluates Build pipeline check runs (e.g. Maven compile, package, assembly).
 */
export function classifyBuild(checkRuns?: Record<string, string | null>, summary?: string): SingleCheckResult {
  if (summary && typeof summary === 'string' && summary.trim()) {
    const lower = summary.toLowerCase();
    if (lower.includes('build') || lower.includes('compile') || lower.includes('maven')) {
      return { status: classifyCheckValue(summary), rawValue: summary };
    }
  }

  if (checkRuns && typeof checkRuns === 'object') {
    for (const [key, val] of Object.entries(checkRuns)) {
      const lower = key.toLowerCase();
      if (lower.includes('build') || lower.includes('compile') || lower.includes('package') || lower.includes('maven') || lower.includes('mvn')) {
        return {
          status: classifyCheckValue(val),
          key,
          rawValue: val,
        };
      }
    }
  }

  return classifyCI(summary, checkRuns);
}

/**
 * Evaluates Test pipeline check runs (e.g. Surefire, JTH, unit tests).
 */
export function classifyTest(checkRuns?: Record<string, string | null>): SingleCheckResult {
  if (checkRuns && typeof checkRuns === 'object') {
    for (const [key, val] of Object.entries(checkRuns)) {
      const lower = key.toLowerCase();
      if (lower.includes('test') || lower.includes('jth') || lower.includes('surefire') || lower.includes('integration')) {
        return {
          status: classifyCheckValue(val),
          key,
          rawValue: val,
        };
      }
    }
  }

  return { status: 'unreported' };
}

/**
 * Evaluates CVE and vulnerability-specific security check runs.
 */
export function classifyCVE(checkRuns?: Record<string, string | null>): SecurityClassificationResult {
  if (!checkRuns || typeof checkRuns !== 'object') {
    return {
      status: 'unreported',
      hasSecurityRisk: false,
      isSecurityPassed: false,
      entries: [],
    };
  }

  const entries: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(checkRuns)) {
    const lower = k.toLowerCase();
    if (lower.includes('cve') || lower.includes('vulnerability') || lower.includes('advisory')) {
      entries.push({ key: k, value: (v || '').toLowerCase() });
    }
  }

  if (entries.length === 0) {
    return {
      status: 'unreported',
      hasSecurityRisk: false,
      isSecurityPassed: false,
      entries,
    };
  }

  const hasSecurityRisk = entries.some(
    e => e.value === 'failure' || e.value === 'fail' || e.value === 'error'
  );

  const isSecurityPassed =
    !hasSecurityRisk &&
    entries.length > 0 &&
    entries.every(e => e.value === 'success' || e.value === 'pass');

  const hasPending = !hasSecurityRisk && entries.some(
    e => e.value === 'pending' || e.value === 'queued' || e.value === 'running'
  );

  const status: CheckStatus = hasSecurityRisk
    ? 'failed'
    : isSecurityPassed
    ? 'passed'
    : hasPending
    ? 'pending'
    : 'unknown';

  return {
    status,
    hasSecurityRisk,
    isSecurityPassed,
    entries,
  };
}

/**
 * Aggregates all check runs into categorized health dimensions.
 */
export function classifyAllChecks(
  checkRuns?: Record<string, string | null>,
  summary?: string
): AllChecksClassification {
  return {
    bom: classifyBOM(checkRuns),
    parentPom: classifyParentPom(checkRuns),
    ci: classifyCI(summary, checkRuns),
    build: classifyBuild(checkRuns, summary),
    test: classifyTest(checkRuns),
    security: classifySecurity(checkRuns),
    cve: classifyCVE(checkRuns),
  };
}
