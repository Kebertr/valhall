import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const manifestIcons = [
  {
    src: 'valhall.png',
    sizes: '192x192',
    type: 'image/png',
  },
  {
    src: 'valhall.png',
    sizes: '512x512',
    type: 'image/png',
  }
]
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
            tailwindcss(),
            VitePWA({
              registerType: 'autoUpdate',
              manifest: {
                name: 'My Awesome App',
                short_name: 'PWA App',
                icons: manifestIcons,
              }
            })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    host: true,
    port: 3000,
    allowedHosts: [
      "valhall.kebert.se"
    ],
  },
})
