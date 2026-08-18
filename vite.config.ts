/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  // Web stays on GitHub-Pages-style /backpack/.
  // tauri build sets TAURI_ENV_PLATFORM (official config reference).
  base: process.env.TAURI_ENV_PLATFORM ? '/' : '/backpack/',
  plugins: [react()],

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
