/**
 * Utilities for sanitizing user input before it reaches database queries.
 */

/**
 * Escapes special PostgreSQL LIKE / ILIKE meta-characters (`%`, `_`, `\`)
 * so that user-supplied search terms are treated as literal strings.
 *
 * Without this, a malicious input such as `%` or `_%` could match every row
 * or produce unexpected pattern-matching behaviour.
 */
export function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}
