/**
 * Security utilities for HTML escaping, CSV sanitization, and shell argument validation.
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
 * - Neutralizes formula injection vulnerabilities (characters =, +, -, @, \t, \r)
 * - Escapes double quotes by doubling them
 * - Wraps in double quotes
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Strip formula injection triggers by prefixing with a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
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
