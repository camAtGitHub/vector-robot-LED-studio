import { describe, expect, it } from 'vitest'
import {
  createPwaPluginOptions,
  createWebManifest,
  resolveViteBase,
  shouldEnablePwa,
} from '../../pwaOptions.ts'

describe('resolveViteBase', () => {
  it('uses / for Tauri embeds', () => {
    expect(resolveViteBase({ TAURI_ENV_PLATFORM: 'linux' })).toBe('/')
  })

  it('keeps the hosted web prefix by default', () => {
    expect(resolveViteBase({})).toBe('/backpack/')
  })

  it('accepts VITE_BASE so a personal server can host at root', () => {
    expect(resolveViteBase({ VITE_BASE: '/' })).toBe('/')
    expect(resolveViteBase({ VITE_BASE: '/studio' })).toBe('/studio/')
  })
})

describe('shouldEnablePwa', () => {
  it('enables the web service worker by default', () => {
    expect(shouldEnablePwa({})).toBe(true)
  })

  it('disables the service worker when Tauri is building', () => {
    expect(shouldEnablePwa({ TAURI_ENV_PLATFORM: 'linux' })).toBe(false)
    expect(shouldEnablePwa({ TAURI_ENV_PLATFORM: 'windows' })).toBe(false)
  })
})

describe('createWebManifest', () => {
  it('is installable as a standalone app', () => {
    const manifest = createWebManifest()
    expect(manifest.name).toBe('Vector Robot LED Backpack Studio')
    expect(manifest.short_name).toBe('Backpack Studio')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('./')
    expect(manifest.scope).toBe('./')
    expect(manifest.theme_color).toBe('#0c1018')
    expect(manifest.background_color).toBe('#0c1018')
  })

  it('includes 192 and 512 PNG icons plus a maskable 512', () => {
    const manifest = createWebManifest()
    const sizes = manifest.icons.map((icon) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(
      manifest.icons.some(
        (icon) => icon.sizes === '512x512' && icon.purpose === 'maskable',
      ),
    ).toBe(true)
    expect(manifest.icons.every((icon) => icon.type === 'image/png')).toBe(true)
  })
})

describe('createPwaPluginOptions', () => {
  it('auto-updates and precaches the static pack fixtures', () => {
    const options = createPwaPluginOptions()
    expect(options.registerType).toBe('autoUpdate')
    expect(options.workbox.globPatterns.some((pattern) => pattern.includes('json'))).toBe(
      true,
    )
    expect(options.manifest).toEqual(createWebManifest())
  })
})
