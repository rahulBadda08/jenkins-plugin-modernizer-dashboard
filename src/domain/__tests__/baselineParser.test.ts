import { describe, it, expect } from 'vitest';
import {
  parseJenkinsVersion,
  isVersionOutdated,
  calculateBaselineDrift,
  LTS_BASELINE,
  parseBaselineMinor,
  getMigrationBaselineMinor,
  getBaselineBucket,
  getBaselineBucketByToken,
} from '../baselineParser';

describe('baselineParser', () => {
  it('parses valid major, minor, and patch numbers', () => {
    expect(parseJenkinsVersion('2.452.3')).toEqual({ major: 2, minor: 452, patch: 3 });
    expect(parseJenkinsVersion('2.440')).toEqual({ major: 2, minor: 440, patch: 0 });
    expect(parseJenkinsVersion('1.625.3')).toEqual({ major: 1, minor: 625, patch: 3 });
  });

  it('returns null for missing or invalid version strings', () => {
    expect(parseJenkinsVersion('')).toBeNull();
    expect(parseJenkinsVersion('0.0')).toBeNull();
    expect(parseJenkinsVersion('unknown')).toBeNull();
    expect(parseJenkinsVersion(undefined)).toBeNull();
  });

  it('identifies outdated Jenkins baselines accurately', () => {
    expect(isVersionOutdated('1.625.3')).toBe(true);
    expect(isVersionOutdated('2.387.3')).toBe(true); // < 440
    expect(isVersionOutdated('2.452.3')).toBe(false); // >= 440
    expect(isVersionOutdated('2.479.1')).toBe(false);
    expect(isVersionOutdated('')).toBe('unknown');
  });

  it('classifies missing versions as unspecified without declaring critical failure', () => {
    const drift = calculateBaselineDrift('');
    expect(drift.criticality).toBe('unspecified');
    expect(drift.gap).toBe(0);
    expect(drift.currentVersion).toBe('Unspecified');
  });

  it('computes correct baseline drift for outdated and aligned versions', () => {
    const outdatedDrift = calculateBaselineDrift('2.387.3', LTS_BASELINE);
    expect(outdatedDrift.gap).toBe(452 - 387); // 65 > 50 -> critical
    expect(outdatedDrift.criticality).toBe('critical');

    const alignedDrift = calculateBaselineDrift('2.452.3', LTS_BASELINE);
    expect(alignedDrift.gap).toBe(0);
    expect(alignedDrift.criticality).toBe('low');
  });

  it('parses baseline minor and resolves baseline buckets correctly', () => {
    expect(parseBaselineMinor('2.452.3')).toBe(452);
    expect(parseBaselineMinor('2.440.1')).toBe(440);
    expect(parseBaselineMinor('1.625')).toBe(0);
    expect(parseBaselineMinor('invalid')).toBeNull();

    expect(getBaselineBucket(400)).toBe('critical');
    expect(getBaselineBucket(445)).toBe('warning');
    expect(getBaselineBucket(455)).toBe('aligned');
    expect(getBaselineBucket(null)).toBe('critical');

    expect(getBaselineBucketByToken('BASELINE_CRITICAL')).toBe('critical');
    expect(getBaselineBucketByToken('BASELINE_WARNING')).toBe('warning');
    expect(getBaselineBucketByToken('BASELINE_ALIGNED')).toBe('aligned');

    expect(getMigrationBaselineMinor({ jenkinsVersion: '2.452.4' })).toBe(452);
    expect(getMigrationBaselineMinor({ effectiveBaseline: '2.440.2' })).toBe(440);
  });
});
