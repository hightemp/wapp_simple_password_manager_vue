import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  base: './',
  plugins: [
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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'docs',
  },
})
