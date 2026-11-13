/// <reference types="vitest" />
import { describe, expect, test } from 'vitest';
import { answersMatch, parseLocaleNumber } from '../../src/stationModules/player/modules/onsiteAnswer';

describe('parseLocaleNumber', () => {
  test('reads a single comma or dot as decimal separator', () => {
    expect(parseLocaleNumber('1,5')).toBeCloseTo(1.5);
    expect(parseLocaleNumber('1.5')).toBeCloseTo(1.5);
    expect(parseLocaleNumber('1.5')).not.toBe(15);
  });

  test('reads dot groups of three as thousands separator', () => {
    expect(parseLocaleNumber('1.890')).toBe(1890);
    expect(parseLocaleNumber('12.345.678')).toBe(12345678);
  });

  test('ignores spaces and apostrophes between thousands', () => {
    expect(parseLocaleNumber('1 890')).toBe(1890);
    expect(parseLocaleNumber('1 890')).toBe(1890);
    expect(parseLocaleNumber("1'890")).toBe(1890);
  });

  test('treats the last separator as decimal when both occur', () => {
    expect(parseLocaleNumber('1.234,5')).toBeCloseTo(1234.5);
    expect(parseLocaleNumber('1,234.5')).toBeCloseTo(1234.5);
  });

  test('returns null for anything that is not a number', () => {
    expect(parseLocaleNumber('abc')).toBeNull();
    expect(parseLocaleNumber('')).toBeNull();
    expect(parseLocaleNumber('1,2,3')).toBeNull();
  });
});

describe('answersMatch', () => {
  test('numeric mode compares values across notations', () => {
    expect(answersMatch('1,5', ['1.5'], true)).toBe(true);
    expect(answersMatch('1 890', ['1890'], true)).toBe(true);
    expect(answersMatch('15', ['1.5'], true)).toBe(false);
  });

  test('numeric mode falls back to text comparison when a side is no number', () => {
    expect(answersMatch(' ABC ', ['abc'], true)).toBe(true);
    expect(answersMatch('abc', ['12'], true)).toBe(false);
  });

  test('text mode ignores case, outer and repeated whitespace', () => {
    expect(answersMatch('  Alter   Brunnen ', ['alter brunnen'], false)).toBe(true);
    expect(answersMatch('Brunnen', ['alter brunnen'], false)).toBe(false);
  });

  test('text mode does not unify number notations', () => {
    expect(answersMatch('1,5', ['1.5'], false)).toBe(false);
  });

  test('matches any of several accepted answers', () => {
    expect(answersMatch('b', ['a', 'B'], false)).toBe(true);
  });
});
