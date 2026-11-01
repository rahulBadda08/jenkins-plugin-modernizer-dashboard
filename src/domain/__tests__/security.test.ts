import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeCsvCell,
  sanitizeShellArg,
  isSafeShellArg,
  isValidExternalUrl,
  parseGitHubRepo,
  SHELL_ADVISORY_HEADER,
} from '../security';
import { generateMasterScript } from '../../application/remediation/generateMasterScript';
import type { EnrichedPlugin } from '../types';

describe('security', () => {
  describe('escapeHtml', () => {
    it('escapes dangerous HTML characters', () => {
      const malicious = '<script>alert("XSS")</script>';
      expect(escapeHtml(malicious)).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('handles single quotes and ampersands', () => {
      const input = "Tom & Jerry's";
      expect(escapeHtml(input)).toBe('Tom &amp; Jerry&#39;s');
    });

    it('handles null, undefined, and non-string types safely', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(123)).toBe('123');
    });
  });

  describe('sanitizeCsvCell', () => {
    it('neutralizes formula injection characters', () => {
      expect(sanitizeCsvCell('=1+1')).toBe(`"'=1+1"`);
      expect(sanitizeCsvCell('+cmd|/c calc')).toBe(`"'+cmd|/c calc"`);
      expect(sanitizeCsvCell('-5')).toBe(`"'-5"`);
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`);
      expect(sanitizeCsvCell('\tTabPrefixed')).toBe(`"'\tTabPrefixed"`);
      expect(sanitizeCsvCell('|calc')).toBe(`"'|calc"`);
      expect(sanitizeCsvCell('%calc')).toBe(`"'%calc"`);
    });

    it('neutralizes formula injection with leading whitespace', () => {
      expect(sanitizeCsvCell('   =cmd|/c calc')).toBe(`"'   =cmd|/c calc"`);
      expect(sanitizeCsvCell('\n-cmd')).toBe(`"'\n-cmd"`);
    });

    it('strips UTF-8 Byte Order Mark (BOM)', () => {
      expect(sanitizeCsvCell('\uFEFF=1+1')).toBe(`"'=1+1"`);
    });

    it('escapes internal double quotes properly', () => {
      expect(sanitizeCsvCell('Hello "World"')).toBe(`"Hello ""World"""`);
    });

    it('handles standard strings safely', () => {
      expect(sanitizeCsvCell('git-plugin')).toBe(`"git-plugin"`);
    });

    it('handles empty or null inputs', () => {
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell('')).toBe('""');
    });
  });

  describe('isSafeShellArg', () => {
    it('accepts valid plugin and repository names', () => {
      expect(isSafeShellArg('git')).toBe(true);
      expect(isSafeShellArg('workflow-job')).toBe(true);
      expect(isSafeShellArg('sample_plugin.v2')).toBe(true);
      expect(isSafeShellArg('jenkins-core-2.580')).toBe(true);
    });

    it('rejects command injection patterns and metacharacters', () => {
      expect(isSafeShellArg('plugin; rm -rf /')).toBe(false);
      expect(isSafeShellArg('$(whoami)')).toBe(false);
      expect(isSafeShellArg('`id`')).toBe(false);
      expect(isSafeShellArg('plugin && evil')).toBe(false);
      expect(isSafeShellArg('plugin | sh')).toBe(false);
      expect(isSafeShellArg('../../../etc/passwd')).toBe(false);
      expect(isSafeShellArg('foo\nbar')).toBe(false);
      expect(isSafeShellArg('')).toBe(false);
      expect(isSafeShellArg(null)).toBe(false);
      expect(isSafeShellArg(undefined)).toBe(false);
    });
  });

  describe('sanitizeShellArg', () => {
    it('returns valid identifiers unchanged', () => {
      expect(sanitizeShellArg('my-valid_plugin.js')).toBe('my-valid_plugin.js');
      expect(sanitizeShellArg('git')).toBe('git');
    });

    it('refuses to silently strip dangerous characters and returns fallback', () => {
      expect(sanitizeShellArg('plugin; rm -rf /')).toBe('unknown');
      expect(sanitizeShellArg('$(whoami)')).toBe('unknown');
      expect(sanitizeShellArg('`id`')).toBe('unknown');
      expect(sanitizeShellArg('$$$&&&')).toBe('unknown');
      expect(sanitizeShellArg('', 'fallback-plugin')).toBe('fallback-plugin');
    });
  });

  describe('isValidExternalUrl', () => {
    it('accepts valid http and https URLs', () => {
      expect(isValidExternalUrl('https://github.com/jenkinsci/git-plugin')).toBe(true);
      expect(isValidExternalUrl('http://jenkins.io')).toBe(true);
      expect(isValidExternalUrl('https://stats.jenkins.io/reports')).toBe(true);
    });

    it('rejects dangerous protocols, credentials, and malformed strings', () => {
      expect(isValidExternalUrl('javascript:alert(1)')).toBe(false);
      expect(isValidExternalUrl('file:///etc/passwd')).toBe(false);
      expect(isValidExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidExternalUrl('https://user:password@malicious.com')).toBe(false);
      expect(isValidExternalUrl('not-a-url')).toBe(false);
      expect(isValidExternalUrl('')).toBe(false);
      expect(isValidExternalUrl(null)).toBe(false);
    });
  });

  describe('parseGitHubRepo', () => {
    it('parses GitHub repository coordinates accurately', () => {
      expect(parseGitHubRepo('https://github.com/jenkinsci/git-plugin.git')).toEqual({
        owner: 'jenkinsci',
        repo: 'git-plugin',
      });
      expect(parseGitHubRepo('https://github.com/jenkins-infra/metadata-plugin-modernizer')).toEqual({
        owner: 'jenkins-infra',
        repo: 'metadata-plugin-modernizer',
      });
    });

    it('returns null for non-GitHub, malformed, or injection payloads', () => {
      expect(parseGitHubRepo('https://gitlab.com/group/repo.git')).toBeNull();
      expect(parseGitHubRepo('https://github.com/')).toBeNull();
      expect(parseGitHubRepo('https://github.com/jenkinsci/git;rm -rf /')).toBeNull();
      expect(parseGitHubRepo(null)).toBeNull();
    });
  });

  describe('generateMasterScript & Command Injection Defense', () => {
    const mockPlugins: EnrichedPlugin[] = [
      {
        pluginName: 'git',
        pluginRepository: 'https://github.com/jenkinsci/git-plugin',
        migrations: [],
        activeMigration: {
          migrationName: 'Upgrade',
          migrationStatus: 'SUCCESS',
          pullRequestStatus: 'MERGED',
          pullRequestUrl: '',
          tags: [],
          timestamp: '2026-01-01',
        },
        healthScore: 100,
        insight: {
          actionInsight: { status: 'Aligned', severity: 'success', summary: [], recommendations: [] },
          priorities: {
            severity: { label: '', status: '', color: '' },
            maintenance: { label: '', status: '', color: '' },
            security: { label: '', status: '', color: '' },
          },
          checklist: [],
          issueBreakdown: {
            deprecated: { label: '', value: false, display: '' },
            ci: { label: '', value: false, display: '' },
            pr: { label: '', value: false, display: '' },
          },
          surgical: {
            drift: { gap: 0, criticality: 'low', currentVersion: '2.580.2', baselineVersion: '2.580.2' },
            commands: ['mvn jenkins-plugin-modernizer:modernize -Drecipe=BomAlignment'],
            difficulty: 1,
          },
        },
      },
    ];

    it('generates executable bash scripts with advisory header for safe plugins', () => {
      const script = generateMasterScript(mockPlugins, ['git'], { timestamp: '2026-11-01T00:00:00Z' });
      expect(script).toContain('#!/usr/bin/env bash');
      expect(script).toContain(SHELL_ADVISORY_HEADER);
      expect(script).toContain('set -euo pipefail');
      expect(script).toContain('# Target Plugin: git');
      expect(script).toContain('mvn jenkins-plugin-modernizer:modernize -Drecipe=BomAlignment');
    });

    it('safely rejects malicious identifiers and NEVER interpolates them into executable lines', () => {
      const maliciousNames = [
        'plugin; rm -rf /',
        'plugin && malicious-command',
        '$(whoami)',
        '`id`',
        'plugin\nrm -rf /',
        'evil" || echo hacked',
      ];

      for (const badName of maliciousNames) {
        const script = generateMasterScript(mockPlugins, [badName]);
        expect(script).toContain('SKIPPED: An invalid or unsafe plugin identifier was omitted');
        expect(script).not.toContain(badName);
        expect(script).not.toContain('rm -rf /');
        expect(script).not.toContain('malicious-command');
        expect(script).not.toContain('$(whoami)');
        expect(script).not.toContain('`id`');
      }
    });
  });
});
