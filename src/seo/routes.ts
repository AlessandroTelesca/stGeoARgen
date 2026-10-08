// Indexierbare Seiten – Grundlage für Sitemap (vite.config.mts) und Meta-Tags (seo.ts).
// Bewusst ohne import.meta, damit die Vite-Config die Datei direkt importieren kann.
export const INDEXABLE_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/paths', priority: '0.9', changefreq: 'weekly' },
  { path: '/glockenspiel', priority: '0.8', changefreq: 'monthly' },
  { path: '/bahnhof', priority: '0.8', changefreq: 'monthly' },
  { path: '/phonomuseum', priority: '0.8', changefreq: 'monthly' },
  { path: '/schwarzes-tor', priority: '0.8', changefreq: 'monthly' },
  { path: '/klosterweiher', priority: '0.8', changefreq: 'monthly' },
  { path: '/info', priority: '0.6', changefreq: 'monthly' },
  { path: '/impressum', priority: '0.2', changefreq: 'yearly' },
  { path: '/datenschutz', priority: '0.2', changefreq: 'yearly' },
] as const;

export type IndexablePath = (typeof INDEXABLE_ROUTES)[number]['path'];
