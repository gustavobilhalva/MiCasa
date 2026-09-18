import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Nuestra Casa',
        short_name: 'Nuestra Casa',
        description: 'Organización del hogar en pareja',
        lang: 'es-AR',
        start_url: '/',
        display: 'standalone',
        background_color: '#fafaf9',
        theme_color: '#4f46e5',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Lista del súper', url: '/super', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Cargar gasto', url: '/gastos?nuevo=1', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
  server: { port: 5173 },
})
