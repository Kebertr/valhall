import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const manifestIcons = [
  {
    src: 'valhall.jpg',
    sizes: '192x192',
    type: 'image/jpg',
  },
  {
    src: 'valhall.jpg',
    sizes: '512x512',
    type: 'image/jpg',
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
