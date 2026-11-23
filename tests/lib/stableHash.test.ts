import { describe, it, expect } from 'vitest';
import { stableHash } from '../../src/lib/stableHash';

describe('stableHash', () => {
  it('ist deterministisch', () => {
    expect(stableHash('Schwarzes Tor')).toBe(stableHash('Schwarzes Tor'));
  });

  it('liefert für verschiedene Eingaben verschiedene Werte', () => {
    expect(stableHash('a')).not.toBe(stableHash('b'));
    expect(stableHash('Frage 1')).not.toBe(stableHash('Frage 2'));
  });

  it('entspricht FNV-1a (Referenzwert: leerer String = Offset-Basis)', () => {
    expect(stableHash('')).toBe((0x811c9dc5).toString(36));
  });
});
