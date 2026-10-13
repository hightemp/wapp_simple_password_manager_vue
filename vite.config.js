import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import UnoCSS from 'unocss/vite'
import path from 'path'

export default defineConfig({
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
  },
  plugins: [
    UnoCSS(),
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
      manifest: {
        name: 'Password Manager',
        short_name: 'PassMgr',
        theme_color: '#ffffff',
        share_target: {
          action: 'index.html',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
        icons: [
          {
            src: './icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: './icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          // Full-bleed square: the launcher cuts its own shape out of it
          {
            src: './icons/maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: './icons/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@octokit/rest', 'webdav/web'],
        },
      },
    },
  },
})
