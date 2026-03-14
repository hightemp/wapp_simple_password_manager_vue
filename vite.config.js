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
            src: './favicons/favicon.ico',
            sizes: '256x256',
            type: 'image/ico',
            purpose: 'any maskable',
          },
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
          {
            src: './icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: './icons/icon-512x512.png',
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
      // @octokit/request dist-web imports node-fetch as fallback,
      // but uses globalThis.fetch in browsers — stub node-fetch out
      'node-fetch': path.resolve(__dirname, 'src/stubs/node-fetch.js'),
    },
  },
  build: {
    outDir: 'docs',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@octokit/rest', 'webdav/web'],
        },
      },
    },
  },
})
