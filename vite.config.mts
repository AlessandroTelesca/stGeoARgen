
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import tailwindcss from '@tailwindcss/vite';
  import path from 'path';
  import { copyFileSync, writeFileSync } from 'fs';
  import { INDEXABLE_ROUTES } from './src/seo/routes';

  const SITE_URL = (process.env.VITE_SITE_URL || 'https://stgeoargen.iiius.de').replace(/\/+$/, '');

  // sitemap.xml mit hreflang-Alternativen (de / en / x-default) für alle indexierbaren Seiten
  function buildSitemap() {
    const lastmod = new Date().toISOString().slice(0, 10);
    // Jede Sprachversion als eigener Eintrag, jeweils mit allen Alternativen (Google-Empfehlung)
    const urls = INDEXABLE_ROUTES.flatMap(({ path: route, priority, changefreq }) => {
      const de = `${SITE_URL}${route}`;
      const en = `${de}?lang=en`;
      return [de, en].map((loc) => [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <xhtml:link rel="alternate" hreflang="de" href="${de}"/>`,
        `    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>`,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${de}"/>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n'));
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  }

  export default defineConfig(({ command }) => {
    const localApiTarget = process.env.VITE_LOCAL_API_TARGET || 'http://127.0.0.1:8000';

    return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'generate-sitemap',
        apply: 'build',
        closeBundle() {
          writeFileSync('build/sitemap.xml', buildSitemap());
          console.log('sitemap.xml generated');
        }
      },
      {
        name: 'copy-htaccess',
        closeBundle() {
          try {
            copyFileSync('public/.htaccess', 'build/.htaccess');
            console.log('.htaccess copied to build directory');
          } catch (err) {
            console.warn('Could not copy .htaccess:', err);
          }
        }
      }
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    // Debug-Logs nicht ausliefern; console.warn/error bleiben für die Fehlersuche erhalten
    esbuild: command === 'build' ? { pure: ['console.log', 'console.debug', 'console.info'] } : undefined,
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: localApiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});