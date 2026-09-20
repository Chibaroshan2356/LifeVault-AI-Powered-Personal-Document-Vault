/**
 * regex.util.ts — Regular Expression Utilities
 *
 * Safely escapes special regular expression characters in user-provided strings
 * to prevent ReDoS and regex syntax injection when constructing dynamic RegExp
 * or MongoDB $regex queries.
 */

/**
 * Escapes regex special characters: . * + ? ^ $ { } ( ) | [ ] \ /
 * Ensures the string is treated as an exact literal substring in regex queries.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
