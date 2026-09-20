import { escapeRegex } from '../../src/utils/regex.util';

describe('escapeRegex Utility', () => {
  it('leaves standard alphanumeric strings unchanged', () => {
    expect(escapeRegex('passport')).toBe('passport');
    expect(escapeRegex('John Doe 123')).toBe('John Doe 123');
  });

  it('escapes all special regex characters', () => {
    const specialChars = '.*+?^${}()|[]\\';
    const escaped = escapeRegex(specialChars);
    expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');

    // Verify it compiles into a valid RegExp and matches only literal string
    const regex = new RegExp(escaped);
    expect(regex.test(specialChars)).toBe(true);
    expect(regex.test('completely different')).toBe(false);
  });

  it('prevents unescaped parenthesis from causing regex syntax errors', () => {
    const malformedInput = 'Aadhaar (Card';
    const escaped = escapeRegex(malformedInput);
    
    // Unescaped RegExp would throw SyntaxError: Invalid regular expression: missing /)
    expect(() => new RegExp(malformedInput)).toThrow();
    expect(() => new RegExp(escaped, 'i')).not.toThrow();

    const regex = new RegExp(escaped, 'i');
    expect(regex.test('My Aadhaar (Card) Scan.pdf')).toBe(true);
  });

  it('prevents ReDoS pattern characters from being interpreted as quantifiers', () => {
    const dangerousInput = '((((((((a+)+)+)+)+)+)+)+';
    const escaped = escapeRegex(dangerousInput);
    
    const regex = new RegExp(escaped);
    expect(regex.test(dangerousInput)).toBe(true);
    expect(regex.test('aaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
  });
});
