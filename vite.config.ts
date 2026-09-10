/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import {
  createPwaPluginOptions,
  resolveViteBase,
  shouldEnablePwa,
} from './pwaOptions.ts'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  // Web stays on GitHub-Pages-style /backpack/ (override with VITE_BASE=/).
  // tauri build sets TAURI_ENV_PLATFORM (official config reference).
  base: resolveViteBase(),
  plugins: [
    react(),
    ...(shouldEnablePwa() ? [VitePWA(createPwaPluginOptions())] : []),
  ],

  // Official Vite + Tauri guide (https://v2.tauri.app/start/frontend/vite/)
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: 'ws', host, port: 1421 }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],

  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
