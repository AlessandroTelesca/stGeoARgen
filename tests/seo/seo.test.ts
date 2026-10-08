import { describe, it, expect } from 'vitest';
import { resolveSeo, SITE_URL } from '../../src/seo/seo';
import { INDEXABLE_ROUTES } from '../../src/seo/routes';

describe('resolveSeo', () => {
  it('liefert für jede indexierbare Route Titel, Beschreibung und hreflang', () => {
    for (const { path } of INDEXABLE_ROUTES) {
      for (const lang of ['de', 'en'] as const) {
        const seo = resolveSeo(path, 'home', lang);
        expect(seo.indexable).toBe(true);
        expect(seo.title.length).toBeGreaterThan(10);
        expect(seo.title.length).toBeLessThanOrEqual(65);
        expect(seo.description.length).toBeGreaterThan(50);
        expect(seo.description.length).toBeLessThanOrEqual(230);
        expect(seo.alternates.map((a) => a.hreflang)).toEqual(['de', 'en', 'x-default']);
      }
    }
  });

  it('setzt Canonical je Sprache', () => {
    expect(resolveSeo('/paths', 'paths', 'de').canonical).toBe(`${SITE_URL}/paths`);
    expect(resolveSeo('/paths', 'paths', 'en').canonical).toBe(`${SITE_URL}/paths?lang=en`);
    expect(resolveSeo('/home', 'home', 'de').canonical).toBe(`${SITE_URL}/`);
    expect(resolveSeo('/paths/', 'paths', 'de').canonical).toBe(`${SITE_URL}/paths`);
  });

  it('markiert private Ansichten und unbekannte Pfade als noindex', () => {
    expect(resolveSeo('/login', 'login', 'de').indexable).toBe(false);
    expect(resolveSeo('/profile', 'profile', 'de').indexable).toBe(false);
    expect(resolveSeo('/', 'points', 'de').indexable).toBe(false);
    expect(resolveSeo('/gibt-es-nicht', 'home', 'de').indexable).toBe(false);
  });

  it('nutzt bei Pfad- und Stationsdetails den Detailtitel', () => {
    expect(resolveSeo('/', 'station', 'de', 'Glockenspiel').title).toBe('Glockenspiel | St.GeoARgen');
  });
});
