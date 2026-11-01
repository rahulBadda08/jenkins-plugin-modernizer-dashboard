import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  validateMigrationRecord,
  validatePluginReport,
  normalizeMigrationStatus,
  normalizePRStatus,
  normalizePluginKey,
  computeDatasetHash,
  fetchWithRetry,
} from '../../../scripts/fetchData.mjs';
import { verifyDatasetFiles } from '../../../scripts/verifyData.mjs';

describe('Ingestion Validation & Normalization', () => {
  describe('normalizePluginKey', () => {
    it('normalizes names to lowercase trimmed string', () => {
      expect(normalizePluginKey(' Git-Plugin ')).toBe('git-plugin');
      expect(normalizePluginKey('WORKFLOW-JOB')).toBe('workflow-job');
      expect(normalizePluginKey('')).toBe('');
      expect(normalizePluginKey(null)).toBe('');
      expect(normalizePluginKey(123)).toBe('');
    });
  });

  describe('normalizeMigrationStatus', () => {
    it('normalizes status variants correctly', () => {
      expect(normalizeMigrationStatus('SUCCESS')).toBe('success');
      expect(normalizeMigrationStatus('pass')).toBe('success');
      expect(normalizeMigrationStatus('FAILURE')).toBe('fail');
      expect(normalizeMigrationStatus('fail')).toBe('fail');
      expect(normalizeMigrationStatus('pending')).toBe('pending');
      expect(normalizeMigrationStatus('running')).toBe('running');
      expect(normalizeMigrationStatus('aborted')).toBe('aborted');
      expect(normalizeMigrationStatus('')).toBe('unknown');
      expect(normalizeMigrationStatus(null)).toBe('unknown');
      expect(normalizeMigrationStatus(123)).toBe('unknown');
    });
  });

  describe('normalizePRStatus', () => {
    it('normalizes PR status variants correctly', () => {
      expect(normalizePRStatus('MERGED')).toBe('merged');
      expect(normalizePRStatus('open')).toBe('open');
      expect(normalizePRStatus('closed')).toBe('closed');
      expect(normalizePRStatus('draft')).toBe('draft');
      expect(normalizePRStatus('unknown_status')).toBe('');
      expect(normalizePRStatus(null)).toBe('');
    });
  });

  describe('validateMigrationRecord', () => {
    it('validates a complete migration and retains all baseline fields', () => {
      const raw = {
        migrationName: 'Upgrade to 2.479',
        migrationStatus: 'success',
        pullRequestStatus: 'merged',
        pullRequestUrl: 'https://github.com/jenkinsci/sample-plugin/pull/1',
        additions: 42,
        deletions: 12,
        changedFiles: 3,
        jenkinsBaseline: '2.440',
        targetBaseline: '2.479',
        effectiveBaseline: '2.462',
        migrationDescription: 'Upgrade Jenkins baseline to modern LTS',
        migrationId: 'io.jenkins.tools.UpgradeBaseline',
        tags: ['baseline', 'core'],
        timestamp: '2026-01-15T10:00:00Z',
        checkRuns: { Jenkins: 'SUCCESS' },
      };

      const result = validateMigrationRecord(raw, 0);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.migration.migrationName).toBe('Upgrade to 2.479');
        expect(result.migration.jenkinsBaseline).toBe('2.440');
        expect(result.migration.targetBaseline).toBe('2.479');
        expect(result.migration.effectiveBaseline).toBe('2.462');
        expect(result.migration.migrationDescription).toBe('Upgrade Jenkins baseline to modern LTS');
        expect(result.migration.migrationId).toBe('io.jenkins.tools.UpgradeBaseline');
        expect(result.migration.additions).toBe(42);
        expect(result.migration.deletions).toBe(12);
        expect(result.migration.changedFiles).toBe(3);
        expect(result.migration.tags).toEqual(['baseline', 'core']);
      }
    });

    it('sanitizes negative or non-finite numbers to 0', () => {
      const raw = {
        migrationName: 'Test Sanitization',
        additions: -10,
        deletions: NaN,
        changedFiles: 'not-a-number',
      };

      const result = validateMigrationRecord(raw, 0);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.migration.additions).toBe(0);
        expect(result.migration.deletions).toBe(0);
        expect(result.migration.changedFiles).toBe(0);
      }
    });

    it('rejects invalid or unsafe pull request URLs', () => {
      const raw = {
        migrationName: 'Suspicious PR',
        pullRequestUrl: 'javascript:alert(1)',
      };

      const result = validateMigrationRecord(raw, 2);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('invalid PR URL');
      }
    });

    it('rejects non-object migration entries', () => {
      expect(validateMigrationRecord(null, 0).valid).toBe(false);
      expect(validateMigrationRecord('string', 1).valid).toBe(false);
      expect(validateMigrationRecord([], 2).valid).toBe(false);
    });
  });

  describe('validatePluginReport', () => {
    it('validates a correct plugin report and records it in seenPluginNames', () => {
      const seen = new Set<string>();
      const rawReport = {
        pluginName: 'git',
        pluginRepository: 'https://github.com/jenkinsci/git-plugin.git',
        migrations: [
          {
            migrationName: 'Upgrade to 2.479',
            migrationStatus: 'success',
            pullRequestStatus: 'merged',
            timestamp: '2026-02-01',
          },
        ],
      };

      const result = validatePluginReport(rawReport, 'reports/git.json', seen);
      expect(result.valid).toBe(true);
      expect(seen.has('git')).toBe(true);
      if (result.valid) {
        expect(result.invalidMigrationsCount).toBe(0);
        expect(result.totalMigrationsCount).toBe(1);
      }
    });

    it('rejects duplicate plugin names case-insensitively', () => {
      const seen = new Set<string>(['git']);
      const rawReport = {
        pluginName: 'Git',
        migrations: [],
      };

      const result = validatePluginReport(rawReport, 'reports/git.json', seen);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Duplicate pluginName detected');
      }
    });

    it('rejects reports with missing or invalid pluginName', () => {
      expect(validatePluginReport({}, 'test.json').valid).toBe(false);
      expect(validatePluginReport({ pluginName: '' }, 'test.json').valid).toBe(false);
      expect(validatePluginReport({ pluginName: 123 }, 'test.json').valid).toBe(false);
    });

    it('rejects reports with non-array migrations', () => {
      const raw = { pluginName: 'sample', migrations: 'none' };
      const result = validatePluginReport(raw, 'test.json');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Missing or non-array migrations');
      }
    });

    it('filters out corrupt migrations and increments invalid count', () => {
      const seen = new Set<string>();
      const raw = {
        pluginName: 'sample-corrupt',
        migrations: [
          { migrationName: 'Valid Migration', migrationStatus: 'success' },
          null,
          { migrationName: 'Malicious Migration', pullRequestUrl: 'javascript:void(0)' },
        ],
      };

      const result = validatePluginReport(raw, 'test.json', seen);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.invalidMigrationsCount).toBe(2);
        expect(result.plugin?.migrations.length).toBe(1);
      }
    });
  });

  describe('computeDatasetHash', () => {
    it('computes deterministic SHA-256 hash across LF and CRLF', () => {
      const contentLf = '{"test": true}\n';
      const contentCrlf = '{"test": true}\r\n';
      const hash1 = computeDatasetHash(contentLf);
      const hash2 = computeDatasetHash(contentCrlf);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('fetchWithRetry & Credential Resilience', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('falls back to unauthenticated request when 401 is encountered with auth headers', async () => {
      const mockFetch = vi.fn();
      let authDroppedCalled = false;

      mockFetch.mockImplementation(async (_url, options) => {
        if (options?.headers?.Authorization) {
          return {
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            headers: new Headers(),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ pluginName: 'fallback-worked' }),
          headers: new Headers(),
        };
      });

      globalThis.fetch = mockFetch;

      const result = await fetchWithRetry(
        'https://raw.githubusercontent.com/test/repo/main/report.json',
        { Authorization: 'Bearer test-token' },
        3,
        {
          allowAuthFallback: true,
          onAuthFallback: () => {
            authDroppedCalled = true;
          },
        }
      );

      expect(result).toEqual({ pluginName: 'fallback-worked' });
      expect(authDroppedCalled).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('aborts immediately on 404 without retry loop', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      });

      globalThis.fetch = mockFetch;

      await expect(
        fetchWithRetry('https://api.github.com/missing', {}, 3)
      ).rejects.toThrow('HTTP 404 Not Found');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('aborts immediately on 400 Bad Request without retry loop', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
      });

      globalThis.fetch = mockFetch;

      await expect(
        fetchWithRetry('https://api.github.com/bad-request', {}, 3)
      ).rejects.toThrow('HTTP 400');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('aborts immediately on 422 Unprocessable Entity without retry loop', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: new Headers(),
      });

      globalThis.fetch = mockFetch;

      await expect(
        fetchWithRetry('https://api.github.com/unprocessable', {}, 3)
      ).rejects.toThrow('HTTP 422');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('extracts rate limit details on 403 when limit is exhausted', async () => {
      const headers = new Headers();
      headers.set('x-ratelimit-remaining', '0');
      headers.set('x-ratelimit-reset', '1800000000');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers,
      });

      globalThis.fetch = mockFetch;

      await expect(
        fetchWithRetry('https://api.github.com/ratelimited', {}, 3)
      ).rejects.toThrow('GitHub API Rate limit exceeded');
    });
  });

  describe('verifyDatasetFiles (scripts/verifyData.mjs)', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'verify-data-test-'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    });

    it('passes for a valid dataset and manifest matching checksum', async () => {
      const plugins = [
        { pluginName: 'alpha', migrations: [] },
        { pluginName: 'beta', migrations: [] },
      ];
      const datasetJson = JSON.stringify(plugins, null, 2) + '\n';
      const hash = computeDatasetHash(datasetJson);
      const manifest = {
        datasetSha256: hash,
        successfulCount: 2,
        successRatio: 1.0,
      };

      const outputFile = path.join(tempDir, 'all_plugins.json');
      const manifestFile = path.join(tempDir, 'manifest.json');

      await fs.writeFile(outputFile, datasetJson, 'utf8');
      await fs.writeFile(manifestFile, JSON.stringify(manifest), 'utf8');

      const result = await verifyDatasetFiles({ outputFile, manifestFile });
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.sha256).toBe(hash);
    });

    it('fails if computed checksum does not match manifest', async () => {
      const plugins = [{ pluginName: 'alpha', migrations: [] }];
      const datasetJson = JSON.stringify(plugins);
      const manifest = {
        datasetSha256: '0000000000000000000000000000000000000000000000000000000000000000',
        successfulCount: 1,
        successRatio: 1.0,
      };

      const outputFile = path.join(tempDir, 'all_plugins.json');
      const manifestFile = path.join(tempDir, 'manifest.json');

      await fs.writeFile(outputFile, datasetJson, 'utf8');
      await fs.writeFile(manifestFile, JSON.stringify(manifest), 'utf8');

      await expect(
        verifyDatasetFiles({ outputFile, manifestFile })
      ).rejects.toThrow('Checksum mismatch');
    });

    it('fails if duplicate plugins exist in dataset', async () => {
      const plugins = [
        { pluginName: 'alpha', migrations: [] },
        { pluginName: 'Alpha', migrations: [] },
      ];
      const datasetJson = JSON.stringify(plugins);
      const hash = computeDatasetHash(datasetJson);
      const manifest = {
        datasetSha256: hash,
        successfulCount: 2,
        successRatio: 1.0,
      };

      const outputFile = path.join(tempDir, 'all_plugins.json');
      const manifestFile = path.join(tempDir, 'manifest.json');

      await fs.writeFile(outputFile, datasetJson, 'utf8');
      await fs.writeFile(manifestFile, JSON.stringify(manifest), 'utf8');

      await expect(
        verifyDatasetFiles({ outputFile, manifestFile })
      ).rejects.toThrow('Duplicate pluginName found in dataset');
    });
  });
});
