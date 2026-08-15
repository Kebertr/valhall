import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const manifestIcons = [
  {
    src: "valhall.jpg",
    sizes: "192x192",
    type: "image/jpg",
  },
  {
    src: "valhall.jpg",
    sizes: "512x512",
    type: "image/jpg",
  },
];

const devProxy = {
  "/api/members": {
    target: "http://localhost:3002",
    changeOrigin: true,
  },
  "/api/member": {
    target: "http://localhost:3002",
    changeOrigin: true,
  },
  "/api/add": {
    target: "http://localhost:3001",
    changeOrigin: true,
  },
  "/api/bongmeister": {
    target: "http://localhost:3001",
    changeOrigin: true,
  },
  "/api/redemption": {
    target: "http://localhost:3001",
    changeOrigin: true,
  },
  "/api/recent": {
    target: "http://localhost:3001",
    changeOrigin: true,
  },
  "/api/files": {
    target: "http://localhost:3003",
    changeOrigin: true,
  },
};

const previewProxy = {
  "/api/members": {
    target: "http://member-api:3002",
    changeOrigin: true,
  },

  "/api/member": {
    target: "http://member-api:3002",
    changeOrigin: true,
  },

  "/api/add": {
    target: "http://bong-api:3001",
    changeOrigin: true,
  },
  "/api/bongmeister": {
    target: "http://bong-api:3001",
    changeOrigin: true,
  },
  "/api/redemption": {
    target: "http://bong-api:3001",
    changeOrigin: true,
  },
  "/api/recent": {
    target: "http://bong-api:3001",
    changeOrigin: true,
  },
  "/api/files": {
    target: "http://videos-api:3003",
    changeOrigin: true,
  },
  "/api/leaderboard": {
    target: "http://bong-api:3001",
    changeOrigin: true,
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: "My Awesome App",
        short_name: "PWA App",
        icons: manifestIcons,
      },
    }),
  ],
  server: {
    proxy: devProxy,
  },
  preview: {
    host: true,
    port: 5173,
    proxy: previewProxy,
    allowedHosts: ["valhall.kebert.se", "dev-valhall.kebert.se"],
  },
});
