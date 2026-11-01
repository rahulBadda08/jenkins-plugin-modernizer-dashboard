import { describe, it, expect } from 'vitest';
import {
  parseJenkinsVersion,
  compareJenkinsVersions,
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
    expect(parseJenkinsVersion('2.580.2')).toEqual({ major: 2, minor: 580, patch: 2 });
    expect(parseJenkinsVersion('2.452.3')).toEqual({ major: 2, minor: 452, patch: 3 });
    expect(parseJenkinsVersion('2.440')).toEqual({ major: 2, minor: 440, patch: 0 });
    expect(parseJenkinsVersion('1.625.3')).toEqual({ major: 1, minor: 625, patch: 3 });
  });

  it('compares Jenkins versions accurately across major, minor, and patch', () => {
    const v1 = { major: 2, minor: 440, patch: 2 };
    const v2 = { major: 2, minor: 440, patch: 3 };
    const v3 = { major: 2, minor: 580, patch: 2 };

    expect(compareJenkinsVersions(v1, v2)).toBe(-1);
    expect(compareJenkinsVersions(v2, v1)).toBe(1);
    expect(compareJenkinsVersions(v2, v2)).toBe(0);
    expect(compareJenkinsVersions(v2, v3)).toBe(-1);
  });

  it('returns null for missing or invalid version strings', () => {
    expect(parseJenkinsVersion('')).toBeNull();
    expect(parseJenkinsVersion('0.0')).toBeNull();
    expect(parseJenkinsVersion('unknown')).toBeNull();
    expect(parseJenkinsVersion(undefined)).toBeNull();
  });

  it('identifies outdated Jenkins baselines accurately taking patch into account', () => {
    expect(isVersionOutdated('1.625.3')).toBe(true);
    expect(isVersionOutdated('2.387.3')).toBe(true); // < 440
    expect(isVersionOutdated('2.440.2')).toBe(true); // Below 2.440.3 threshold
    expect(isVersionOutdated('2.440.3')).toBe(false); // Exactly at threshold
    expect(isVersionOutdated('2.452.3')).toBe(false);
    expect(isVersionOutdated('2.580.2')).toBe(false);
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
    expect(outdatedDrift.gap).toBe(580 - 387);
    expect(outdatedDrift.criticality).toBe('critical');

    const alignedDrift = calculateBaselineDrift('2.580.2', LTS_BASELINE);
    expect(alignedDrift.gap).toBe(0);
    expect(alignedDrift.criticality).toBe('low');
  });

  it('classifies baseline buckets accurately across patch boundaries', () => {
    // 2.440.2 is strictly < 2.440.3 -> critical
    expect(getBaselineBucket('2.440.2')).toBe('critical');
    // 2.440.3 meets minimum but < 2.580.2 -> warning
    expect(getBaselineBucket('2.440.3')).toBe('warning');
    // 2.580.1 is < 2.580.2 -> warning
    expect(getBaselineBucket('2.580.1')).toBe('warning');
    // 2.580.2 meets LTS -> aligned
    expect(getBaselineBucket('2.580.2')).toBe('aligned');

    // Number minor support
    expect(getBaselineBucket(400)).toBe('critical');
    expect(getBaselineBucket(452)).toBe('warning');
    expect(getBaselineBucket(585)).toBe('aligned');
    expect(getBaselineBucket(null)).toBe('unspecified');

    expect(getBaselineBucketByToken('BASELINE_CRITICAL')).toBe('critical');
    expect(getBaselineBucketByToken('BASELINE_WARNING')).toBe('warning');
    expect(getBaselineBucketByToken('BASELINE_ALIGNED')).toBe('aligned');
    expect(getBaselineBucketByToken('BASELINE_UNSPECIFIED')).toBe('unspecified');

    expect(parseBaselineMinor('2.580.2')).toBe(580);
    expect(getMigrationBaselineMinor({ jenkinsVersion: '2.580.2' })).toBe(580);
    expect(getMigrationBaselineMinor({ effectiveBaseline: '2.440.2' })).toBe(440);
    expect(getMigrationBaselineMinor({ jenkinsBaseline: '2.452.3' })).toBe(452);
    expect(getMigrationBaselineMinor({ targetBaseline: '2.500.1' })).toBe(500);
  });
});
