import { useEffect } from 'react';
import type { Language } from '../i18n/translations';
import { resolveSeo } from '../seo/seo';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function setAlternates(alternates: { hreflang: string; href: string }[]) {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
  alternates.forEach(({ hreflang, href }) => {
    const el = document.createElement('link');
    el.rel = 'alternate';
    el.hreflang = hreflang;
    el.href = href;
    document.head.appendChild(el);
  });
}

/** Hält Titel, Meta-Description, Canonical, hreflang, Open Graph und robots synchron zur aktuellen Ansicht. */
export function useSeo(pathname: string, view: string, language: Language, detailTitle?: string) {
  useEffect(() => {
    const seo = resolveSeo(pathname, view, language, detailTitle);

    document.documentElement.lang = language;
    document.title = seo.title;

    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'robots', seo.indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow');
    upsertCanonical(seo.canonical);
    setAlternates(seo.alternates);

    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:url', seo.canonical);
    upsertMeta('property', 'og:locale', language === 'de' ? 'de_DE' : 'en_US');
    upsertMeta('property', 'og:locale:alternate', language === 'de' ? 'en_US' : 'de_DE');
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
  }, [pathname, view, language, detailTitle]);
}
