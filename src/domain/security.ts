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
 * Sanitizes a shell identifier/argument (e.g. repository name or plugin name).
 * Restricts to safe alphanumeric characters, dots, dashes, and underscores.
 */
export function sanitizeShellArg(value: string, fallback = 'unknown'): string {
  if (!value || typeof value !== 'string') return fallback;
  const sanitized = value.replace(/[^a-zA-Z0-9._-]/g, '');
  return sanitized || fallback;
}
