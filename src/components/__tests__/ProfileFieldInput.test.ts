import { expect, test } from 'vitest';
import { cleanValue } from '../ProfileFieldInput';

test('phone numbers keep digits only, up to 10', () => {
  expect(cleanValue('tel', '(925) 555-0100')).toBe('9255550100');
  expect(cleanValue('tel', '925.555.0100 ext')).toBe('9255550100');
  expect(cleanValue('tel', '1234567890123456789')).toBe('1234567890');
  expect(cleanValue('digits', 'a1b2')).toBe('12');
  expect(cleanValue('text', 'Ms. Lee')).toBe('Ms. Lee');
});
