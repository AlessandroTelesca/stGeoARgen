
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

  export default defineConfig(() => {
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
        'vaul@1.1.2': 'vaul',
        'sonner@2.0.3': 'sonner',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'next-themes@0.4.6': 'next-themes',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
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