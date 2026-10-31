import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeCsvCell, sanitizeShellArg } from '../security';

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

  describe('sanitizeShellArg', () => {
    it('strips shell metacharacters and command substitutions', () => {
      expect(sanitizeShellArg('plugin; rm -rf /')).toBe('pluginrm-rf');
      expect(sanitizeShellArg('$(whoami)')).toBe('whoami');
      expect(sanitizeShellArg('`id`')).toBe('id');
      expect(sanitizeShellArg('my-valid_plugin.js')).toBe('my-valid_plugin.js');
    });

    it('falls back to default if string is empty or invalid', () => {
      expect(sanitizeShellArg('$$$&&&')).toBe('unknown');
      expect(sanitizeShellArg('', 'fallback-plugin')).toBe('fallback-plugin');
    });
  });
});
