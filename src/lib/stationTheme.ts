import type { CSSProperties } from 'react';

/**
 * Akzentfarbe einer Station: reine Funktionen für Normalisierung, Kontrastprüfung und Theme-Props.
 * Hex-Werte sind hier erlaubt (Daten/Logik); in Komponenten kommen Farben nur über Tokens.
 */

/** Tannengrün = --primary aus src/styles/colors.css */
export const DEFAULT_STATION_ACCENT = '#0c690f';

/** Kuratierte Auswahl für den Editor; hex null = Standard (Tannengrün) */
export const STATION_ACCENTS: readonly { id: string; hex: string | null; labelKey: string }[] = [
  { id: 'tannengruen', hex: null, labelKey: 'stationAccent_tannengruen' },
  { id: 'moos', hex: '#3f6212', labelKey: 'stationAccent_moos' },
  { id: 'tannenschatten', hex: '#1f3d2b', labelKey: 'stationAccent_tannenschatten' },
  { id: 'petrol', hex: '#0f5e66', labelKey: 'stationAccent_petrol' },
  { id: 'seeblau', hex: '#1d4e89', labelKey: 'stationAccent_seeblau' },
  { id: 'heidelbeere', hex: '#4b3a7a', labelKey: 'stationAccent_heidelbeere' },
  { id: 'uhrmacherholz', hex: '#6b4423', labelKey: 'stationAccent_uhrmacherholz' },
  { id: 'basalt', hex: '#3b4a3f', labelKey: 'stationAccent_basalt' },
];

/** Nur #rrggbb, Ausgabe kleingeschrieben; alles andere → null */
export function normalizeHex(v: unknown): string | null {
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null;
}

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  const part = (c: number) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Relative Leuchtdichte nach WCAG 2.x (0 = Schwarz, 1 = Weiß) */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhältnis nach WCAG 2.x (1 … 21) */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `amount` Anteil Farbe, Rest Weiß (in sRGB gerechnet; Näherung für color-mix(in oklab, …)) */
export function mixWithWhite(hex: string, amount: number): string {
  const [r, g, b] = toRgb(hex);
  const mix = (c: number) => 255 - (255 - c) * amount;
  return toHex([mix(r), mix(g), mix(b)]);
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

function isReadable(hex: string, min: number): boolean {
  return contrastRatio(hex, '#ffffff') >= min && contrastRatio(hex, mixWithWhite(hex, 0.1)) >= min;
}

/**
 * Stellt sicher, dass weißer Text auf der Farbe und die Farbe als Text auf ihrer 10-%-Tönung
 * lesbar sind (mindestens `min`:1). Zu helle Farben werden in kleinen Schritten abgedunkelt.
 */
export function ensureContrast(hex: string, min = 4.5): string {
  if (isReadable(hex, min)) return hex;
  const [h, s, l] = rgbToHsl(toRgb(hex));
  let lightness = l;
  let result = hex;
  while (lightness > 0 && !isReadable(result, min)) {
    lightness = Math.max(0, lightness - 0.02);
    result = hslToHex(h, s, lightness);
  }
  return result;
}

/**
 * Hinweis für den Editor: Rot wirkt wie ein Fehler, Gold wie eine Belohnung (beides ist in der App
 * reserviert), sehr dunkle Farben sind auf der schwarzen Bühne kaum sichtbar.
 */
export function hueWarning(hex: string): 'red' | 'gold' | 'tooDark' | null {
  const [h, s] = rgbToHsl(toRgb(hex));
  if (s > 0.45 && (h >= 345 || h <= 15)) return 'red';
  if (s > 0.45 && h >= 35 && h <= 58) return 'gold';
  if (contrastRatio(hex, '#000000') < 1.6) return 'tooDark';
  return null;
}

/** className + Inline-Variable für das Akzent-Theme (.station-theme in index.css); ungültig → Standard */
export function stationThemeProps(color: string | null | undefined): { className?: string; style?: CSSProperties } {
  const normalized = normalizeHex(color);
  if (!normalized) return {};
  return {
    className: 'station-theme',
    style: { ['--station-accent' as string]: ensureContrast(normalized) } as CSSProperties,
  };
}
