import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATION_ACCENT,
  STATION_ACCENTS,
  contrastRatio,
  ensureContrast,
  hueWarning,
  mixWithWhite,
  normalizeHex,
  stationThemeProps,
} from '../../src/lib/stationTheme';

describe('stationTheme', () => {
  it('berechnet den Kontrast Weiß/Schwarz als 21', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
  });

  it('normalisiert nur #rrggbb', () => {
    expect(normalizeHex('#ABCDEF')).toBe('#abcdef');
    expect(normalizeHex('abcdef')).toBeNull();
    expect(normalizeHex('#abc')).toBeNull();
    expect(normalizeHex(42)).toBeNull();
  });

  it('Standard-Akzent ist gegen Weiß lesbar', () => {
    expect(contrastRatio(DEFAULT_STATION_ACCENT, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it.each(STATION_ACCENTS.map((a) => [a.id, a.hex ?? DEFAULT_STATION_ACCENT]))('kuratierte Farbe %s (%s) ist lesbar', (_id, hex) => {
    expect(contrastRatio(hex, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(hex, mixWithWhite(hex, 0.1))).toBeGreaterThanOrEqual(4.5);
  });

  it('dunkelt zu helle Farben ab', () => {
    const fixed = ensureContrast('#9be29b');
    expect(fixed).not.toBe('#9be29b');
    expect(contrastRatio(fixed, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(fixed, mixWithWhite(fixed, 0.1))).toBeGreaterThanOrEqual(4.5);
  });

  it('lässt gute Farben unverändert', () => {
    expect(ensureContrast('#0c690f')).toBe('#0c690f');
    expect(ensureContrast('#1f3d2b')).toBe('#1f3d2b');
  });

  it('warnt vor Rot, Gold und zu dunklen Farben', () => {
    expect(hueWarning('#d32f2f')).toBe('red');
    expect(hueWarning('#e0b020')).toBe('gold');
    expect(hueWarning('#0c690f')).toBeNull();
    expect(hueWarning('#050505')).toBe('tooDark');
  });

  it('liefert für fehlende oder ungültige Farben keine Props', () => {
    expect(stationThemeProps(null)).toEqual({});
    expect(stationThemeProps(undefined)).toEqual({});
    expect(stationThemeProps('xyz')).toEqual({});
  });

  it('setzt Klasse und Variable für gültige Farben', () => {
    const props = stationThemeProps('#1D4E89');
    expect(props.className).toBe('station-theme');
    expect((props.style as Record<string, string>)['--station-accent']).toBe('#1d4e89');
  });
});
