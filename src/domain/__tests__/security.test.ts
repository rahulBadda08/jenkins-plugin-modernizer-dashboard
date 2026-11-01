import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeCsvCell,
  sanitizeShellArg,
  isSafeShellArg,
  SHELL_ADVISORY_HEADER,
} from '../security';

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
      // Must NOT silently mutate 'plugin; rm -rf /' into 'pluginrm-rf'
      expect(sanitizeShellArg('plugin; rm -rf /')).toBe('unknown');
      expect(sanitizeShellArg('$(whoami)')).toBe('unknown');
      expect(sanitizeShellArg('`id`')).toBe('unknown');
      expect(sanitizeShellArg('$$$&&&')).toBe('unknown');
      expect(sanitizeShellArg('', 'fallback-plugin')).toBe('fallback-plugin');
    });
  });

  describe('SHELL_ADVISORY_HEADER', () => {
    it('provides standard security warning', () => {
      expect(SHELL_ADVISORY_HEADER).toContain('ADVISORY');
      expect(SHELL_ADVISORY_HEADER).toContain('Maintainers must review commands and test locally');
    });
  });
});
