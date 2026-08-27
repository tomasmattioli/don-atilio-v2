import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/roles': 'http://127.0.0.1:8000',
      '/usuarios': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
      '/catalogo': 'http://127.0.0.1:8000',
      '/caja': 'http://127.0.0.1:8000',
      '/ventas': 'http://127.0.0.1:8000',
      '/inventario': 'http://127.0.0.1:8000',
      '/reportes': 'http://127.0.0.1:8000',
      '/docs': 'http://127.0.0.1:8000',
      '/openapi.json': 'http://127.0.0.1:8000',
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Mi Abejita POS',
        short_name: 'Mi Abejita',
        description: 'Sistema de Punto de Venta para Mi Abejita',
        theme_color: '#16324F',
        background_color: '#F1F5F9',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any',
          },
        ],
      },
    }),
  ],
})
