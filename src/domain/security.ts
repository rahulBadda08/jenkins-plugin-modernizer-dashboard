/**
 * Security utilities for HTML escaping, CSV sanitization, URL validation, and shell argument safety.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

/**
 * Escapes unsafe HTML characters to prevent XSS attacks in DOM / tooltip injections.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'/]/g, char => HTML_ENTITY_MAP[char] || char);
}

/**
 * Sanitizes a cell value for CSV export:
 * - Strips Byte Order Mark (\uFEFF) if present at start
 * - Neutralizes formula injection vulnerabilities (characters =, +, -, @, \t, \r, %, |)
 *   including when preceded by whitespace
 * - Escapes double quotes by doubling them as per RFC 4180
 * - Wraps in double quotes
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).replace(/^\uFEFF/, '');

  // Strip formula injection triggers (including when preceded by spaces/newlines)
  const isTriggered =
    /^[=+\-@\t\r%|]/.test(str) || /^[=+\-@\t\r%|]/.test(str.replace(/^[ \n]+/, ''));
  if (isTriggered) {
    str = `'${str}`;
  }

  // Escape double quotes as per RFC 4180
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Strict allowlist validation pattern for repository and plugin identifiers.
 * Permits only alphanumeric characters, dots, hyphens, and underscores.
 */
export const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9._-]+$/;

/**
 * Validates whether an input is a safe shell/repository identifier.
 * Refuses strings with spaces, command substitution ($(...), `...`), path traversal, or operators.
 */
export function isSafeShellArg(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && SAFE_IDENTIFIER_PATTERN.test(value.trim());
}

/**
 * Safe shell identifier resolver:
 * - If the value strictly conforms to the safe identifier allowlist, returns the trimmed value.
 * - If invalid, refuses to generate commands and returns fallback.
 * - Avoids silent character stripping that mutates malformed or malicious input into unintended target names.
 */
export function sanitizeShellArg(value: string, fallback = 'unknown'): string {
  if (!value || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (SAFE_IDENTIFIER_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

/**
 * Validates whether an input is a safe external HTTP or HTTPS URL.
 * Rejects non-HTTP protocols (e.g. javascript:, file:), embedded credentials, and invalid hostnames.
 */
export function isValidExternalUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    if (url.username || url.password) return false;
    if (!url.hostname || !url.hostname.includes('.')) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely sanitizes an external URL, guaranteeing that only valid HTTPS/HTTP URLs are returned.
 * Returns null if the URL is invalid, malicious, or contains embedded credentials.
 */
export function sanitizeExternalUrl(value: unknown): string | null {
  if (!isValidExternalUrl(value)) return null;
  return String(value).trim();
}

export interface GitHubRepoRef {
  owner: string;
  repo: string;
}

/**
 * Safely parses a GitHub repository URL into its owner and repository names.
 * Both owner and repo must strictly conform to SAFE_IDENTIFIER_PATTERN.
 */
export function parseGitHubRepo(repoUrl: unknown): GitHubRepoRef | null {
  if (!isValidExternalUrl(repoUrl)) return null;
  try {
    const url = new URL(String(repoUrl).trim());
    if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return null;
    const parts = url.pathname.replace(/^\/|\/$/g, '').split('/');
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, '');
    if (isSafeShellArg(owner) && isSafeShellArg(repo)) {
      return { owner, repo };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Standard security advisory banner prepended to generated remediation shell scripts.
 * Emphasizes that generated commands are non-authoritative recommendations requiring human review.
 */
export const SHELL_ADVISORY_HEADER = [
  '# -----------------------------------------------------------------------------',
  '# ADVISORY: The following commands are automated recommendations based on',
  '# static metadata analysis. Maintainers must review commands and test locally',
  '# before executing in production environments.',
  '# -----------------------------------------------------------------------------',
].join('\n');
