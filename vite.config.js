import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/notesik.app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Notesik Lite',
        short_name: 'Notesik Lite',
        description: 'Notatki do programu kongresu i zgromadzenia',
        start_url: '/notesik.app/',
        scope: '/notesik.app/',
        display: 'standalone',
        background_color: '#0f1115',
        theme_color: '#1b6b57',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        // programs/*.pdf mogą być duże i rzadko się zmieniają - dociągane na żądanie, nie prekeszowane w service workerze
        globIgnores: ['programs/**/*.pdf'],
      },
    }),
  ],
})
