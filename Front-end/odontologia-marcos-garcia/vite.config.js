import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// En Vercel no hay una API en localhost: sin VITE_API_URL (o con http://, que el navegador
// bloquea desde un sitio https) el sitio publicado no podría ni iniciar sesión
function exigirApiEnVercel(mode) {
  if (!process.env.VERCEL) return;
  const { VITE_API_URL } = loadEnv(mode, process.cwd(), 'VITE_');
  if (!VITE_API_URL) {
    throw new Error('Falta VITE_API_URL en las variables de entorno del proyecto de Vercel (p. ej. https://<api>.vercel.app/api).');
  }
  if (!VITE_API_URL.startsWith('https://')) {
    throw new Error(`VITE_API_URL tiene que empezar con https:// (es "${VITE_API_URL}").`);
  }
}

export default defineConfig(({ command, mode }) => {
  if (command === 'build') exigirApiEnVercel(mode);

  return {
    plugins: [
      react(),
      // PWA: manifest + service worker (solo en el build; en `npm run dev` no se registra)
      VitePWA({
        // Una versión nueva no se activa sola: se avisa y el usuario elige cuándo recargar,
        // así no se pierde un formulario a medio completar
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'Armonía · Odontología y Estética Facial',
          short_name: 'Armonía',
          description: 'Agendá tu turno y seguí tus citas en Armonía, San Juan de Colón.',
          lang: 'es',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#5c0e6d',
          categories: ['health', 'medical'],
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            {
              name: 'Agendar turno',
              short_name: 'Agendar',
              url: '/sign-up',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
        },
        workbox: {
          // The app shell is stored up front so it opens offline. Photos and fonts are stored the first time
          // they are shown, so a phone does not download every photo in the background on its first visit.
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          // API data is never stored: appointments and patients always come from the server
          runtimeCaching: [
            {
              urlPattern: ({ request, sameOrigin }) => sameOrigin && (request.destination === 'image' || request.destination === 'font'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'media',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
    server: {
      port: 3000, // el mismo puerto que usaba Create React App
    },
    build: {
      outDir: 'build', // Vercel lo sabe por vercel.json (outputDirectory)
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.js'],
    },
  };
});
