/** Web / Tauri base path. Web defaults to /backpack/; override with VITE_BASE. */
export function resolveViteBase(
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.TAURI_ENV_PLATFORM) return '/'
  const override = env.VITE_BASE
  if (override === undefined || override === '') return '/backpack/'
  return override.endsWith('/') ? override : `${override}/`
}

/** Service workers do not belong inside the Tauri webview. */
export function shouldEnablePwa(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return !env.TAURI_ENV_PLATFORM
}

export type PwaIcon = {
  src: string
  sizes: string
  type: 'image/png'
  purpose?: 'any' | 'maskable' | 'any maskable'
}

export type WebManifest = {
  id: string
  name: string
  short_name: string
  description: string
  start_url: string
  scope: string
  display: 'standalone'
  background_color: string
  theme_color: string
  lang: string
  orientation: 'any'
  categories: string[]
  icons: PwaIcon[]
}

export function createWebManifest(): WebManifest {
  return {
    id: 'com.vector.backpack-studio',
    name: 'Vector Robot LED Backpack Studio',
    short_name: 'Backpack Studio',
    description:
      'Offline designer for Vector 3-LED backpack light packs. Preview, edit, and export robot-ready zips.',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#0c1018',
    theme_color: '#0c1018',
    lang: 'en',
    orientation: 'any',
    categories: ['design', 'utilities'],
    icons: [
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

export function createPwaPluginOptions() {
  return {
    registerType: 'autoUpdate' as const,
    includeAssets: [
      'favicon.svg',
      'apple-touch-icon.png',
      'pwa-192x192.png',
      'pwa-512x512.png',
      'pwa-maskable-512x512.png',
    ],
    manifest: createWebManifest(),
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest}'],
      cleanupOutdatedCaches: true,
    },
  }
}
