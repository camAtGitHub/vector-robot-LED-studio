# Plan: GitHub Actions native apps (Linux / Windows / macOS) → GitHub Releases

Executable in new chats, in order. Copy official Tauri 2 + `tauri-action` APIs; do not invent Electron, updater, or undocumented action inputs.

**Decision:** wrap this existing Vite + React SPA with **Tauri 2**, then copy the official GitHub pipeline. Do **not** add Electron.

Why Tauri (from docs + this repo):

- README already deferred desktop as “no Tauri/Electron in v1” (`README.md` stack section).
- Official wrap path for an existing frontend is `npm install -D @tauri-apps/cli@latest` + `npx tauri init` ([Create a Project — Manual Setup](https://v2.tauri.app/start/create-project/)).
- Official pipeline `tauri-apps/tauri-action@v1` builds macOS / Linux / Windows **and** creates the GitHub Release ([GitHub pipeline](https://v2.tauri.app/distribute/pipelines/github/), [tauri-action README](https://github.com/tauri-apps/tauri-action)).
- This app is already a static SPA with browser `fetch` / `<input type="file">` / `<a download>`. It does not need `@tauri-apps/api`, filesystem plugins, or a custom Rust command.

Electron is a documented alternative (electron-vite + electron-builder `--publish`), but it requires a new main process, a heavier runtime, and has no first-party “wrap this Vite SPA” path. Out of scope.

---

## Phase 0 — Allowed APIs (discovery)

### What already exists (use these)

| Need | Existing API | Source |
|---|---|---|
| Web build | `"build": "tsc -b && vite build"` → `dist/` | `package.json:7` |
| Dev server | `"dev": "vite"` on port **5173** (Vite default; no custom port) | `package.json:6`, `README.md` |
| Hosted-web asset prefix | `base: '/backpack/'` | `vite.config.ts:7` |
| Fixture fetch under that prefix | `` `${import.meta.env.BASE_URL}fixtures/packs` `` | `src/io/packFs.ts:585-608` |
| App title | `Vector Robot LED Backpack Studio` | `index.html:7` |
| Tests | `"test": "vitest run"` — node env, `src/**/*.test.ts` | `package.json`, `vite.config.ts:9-12` |
| Lint | `"lint": "oxlint"` | `package.json:9` |
| Node types in Vite config | `@types/node` already a devDependency | `package.json:22` |
| Save / export | `downloadProject`, `downloadPackAsZip`, file inputs | `src/domain/project.ts`, `src/io/packFs.ts`, `Header.tsx` |
| Favorites | `localStorage` key `bpld.favorites.v1` | `src/domain/favorites.ts` |

### What does **not** exist (do not invent)

- No `.github/` workflows, no remotes, no tags. This clone has only `[core]` in `.git/config`.
- No `src-tauri/`, no `Cargo.toml`, no Electron config.
- No app version in the UI (`package.json` is `"0.0.0"`).
- No File System Access API (`showSaveFilePicker` / `showDirectoryPicker`).
- No React router — stay a single-page load.

### Allowed Tauri / Actions APIs (copy these; do not invent)

**CLI** — [Tauri CLI](https://v2.tauri.app/reference/cli/), [Create a Project](https://v2.tauri.app/start/create-project/)

```bash
npm install -D @tauri-apps/cli@latest
npx tauri init
# flags if non-interactive:
#   --app-name --window-title --frontend-dist --dev-url
#   --before-dev-command --before-build-command --ci
npx tauri icon <png-or-svg>
npx tauri build
npx tauri info
```

**`src-tauri/tauri.conf.json` keys** — official v2 template + [config reference](https://v2.tauri.app/reference/config/) + [Vite frontend](https://v2.tauri.app/start/frontend/vite/)

| Key | Use |
|---|---|
| `$schema` | `https://schema.tauri.app/config/2` |
| `productName` | display name; pattern `^[^/\\:*?"<>|]+$` |
| `version` | semver **or** a path to a `package.json` that has `version` |
| `identifier` | reverse-DNS, `A-Z a-z 0-9 - .` only |
| `build.frontendDist` | `../dist` |
| `build.devUrl` | `http://localhost:5173` |
| `build.beforeDevCommand` | `npm run dev` |
| `build.beforeBuildCommand` | `npm run build` (this repo’s script) |
| `app.windows[]` | `title`, `width`, `height` |
| `app.security.csp` | template uses `null` |
| `bundle.active` | **`true`** (schema default is `false` — installers will not be built if omitted) |
| `bundle.targets` | `"all"` |
| `bundle.icon` | paths from `tauri icon` |
| `bundle.macOS.signingIdentity` | `"-"` for official ad-hoc signing (no Apple cert) |

**v1 keys that must not appear:** `build.distDir`, `build.devPath`, `package.productName`, `tauri.bundle.identifier`.

**Env vars set during `tauri build` / `beforeBuildCommand`** ([config reference](https://v2.tauri.app/reference/config/)): `TAURI_ENV_PLATFORM`, `TAURI_ENV_ARCH`, `TAURI_ENV_FAMILY`, `TAURI_ENV_PLATFORM_VERSION`, `TAURI_ENV_PLATFORM_TYPE`, `TAURI_ENV_DEBUG`.

**GitHub Action** — only inputs in [tauri-action `action.yml`](https://github.com/tauri-apps/tauri-action):

`tagName`, `releaseName`, `releaseBody`, `releaseDraft`, `prerelease`, `args`, `generateReleaseNotes`.  
`__VERSION__` in `tagName` / `releaseName` is replaced by the app version.

**Do not use:** `includeUpdaterJson` (renamed to `uploadUpdaterJson`), `tauri-action@v0`, `webkit2gtk-4.0`, `actions-rs/toolchain`, `includeRelease`, `includeDebug`.

**Permissions / token** — [GitHub workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions) + Tauri pipeline:

```yaml
permissions:
  contents: write
# env:
#   GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Identity defaults (edit if the owner prefers)

| Field | Value | Why |
|---|---|---|
| `productName` | `Vector Backpack Studio` | legal for `productName` (no `/\:*?"<>\|`) |
| Window `title` | `Vector Robot LED Backpack Studio` | copy `index.html` |
| `identifier` | `com.vector.backpack-studio` | reverse-DNS; change before the first public release — it becomes the bundle id |
| `version` | `0.1.0` in `tauri.conf.json` | official template default; this is what `__VERSION__` and the Git tag use |
| Window size | `width: 1400`, `height: 900` | official keys; 800×600 template is too small for this 3-pane editor |

### Artifacts the official pipeline uploads

| Runner | Bundles |
|---|---|
| `ubuntu-22.04` | `.AppImage`, `.deb`, `.rpm` |
| `ubuntu-22.04-arm` | same, arm64 — **public repos only** |
| `windows-latest` | `.msi`, `-setup.exe` (NSIS) |
| `macos-latest` `--target aarch64-apple-darwin` | `.app`, `.dmg` (Apple Silicon) |
| `macos-latest` `--target x86_64-apple-darwin` | `.app`, `.dmg` (Intel) |

### Out of scope (later plan)

- Apple Developer ID + notarization (`APPLE_CERTIFICATE`, `APPLE_API_KEY`, …)
- Windows Authenticode / Azure Trusted Signing
- Tauri updater plugin + `latest.json`
- iOS / Android (`tauri-action` `mobile` is experimental)
- Rewriting save/export to native file dialogs
- Electron / Forge / electron-builder

### Repo prerequisite (human)

This clone has **no GitHub remote**. Actions cannot run until the repo is pushed to GitHub. After the files land, create the GitHub repo and push `master`. If Actions fail with “Resource not accessible by integration”, set the repo’s Actions → Workflow permissions to read/write (documented on the Tauri GitHub page).

---

## Phase 1 — Initialize Tauri 2 next to the existing SPA

**What to implement**

1. Install the official CLI only:

   ```bash
   npm install -D @tauri-apps/cli@latest
   ```

   Do **not** add `@tauri-apps/api` or `tauri-plugin-opener` unless a later phase needs them. Browser download + `localStorage` already work in the webview.

2. Add the npm script the official `package.json` template uses:

   ```json
   "tauri": "tauri"
   ```

3. Init into this repo (do **not** run `npm create tauri-app` — that scaffolds a new frontend):

   ```bash
   npx tauri init --ci \
     --app-name "Vector Backpack Studio" \
     --window-title "Vector Robot LED Backpack Studio" \
     --frontend-dist ../dist \
     --dev-url http://localhost:5173 \
     --before-dev-command "npm run dev" \
     --before-build-command "npm run build"
   ```

   Flags from [CLI `init`](https://v2.tauri.app/reference/cli/#init). `--ci` skips prompts.

4. Confirm the official layout from [Project Structure](https://v2.tauri.app/start/project-structure/):

   ```
   src-tauri/
     Cargo.toml
     Cargo.lock          # commit this (official configuration-files page)
     build.rs            # must call tauri_build::build()
     tauri.conf.json
     src/main.rs         # leave as generated; edit lib.rs if anything
     src/lib.rs
     capabilities/       # keep generated default only
     icons/              # Phase 3
   ```

5. Open `src-tauri/tauri.conf.json` and make it match the official v2 template keys (copy from [create-tauri-app `%(v2)%tauri.conf.json.lte`](https://github.com/tauri-apps/create-tauri-app/blob/dev/templates/_base_/src-tauri/%25(v2)%25tauri.conf.json.lte)), then set:

   ```json
   {
     "$schema": "https://schema.tauri.app/config/2",
     "productName": "Vector Backpack Studio",
     "version": "0.1.0",
     "identifier": "com.vector.backpack-studio",
     "build": {
       "beforeDevCommand": "npm run dev",
       "devUrl": "http://localhost:5173",
       "beforeBuildCommand": "npm run build",
       "frontendDist": "../dist"
     },
     "app": {
       "windows": [
         {
           "title": "Vector Robot LED Backpack Studio",
           "width": 1400,
           "height": 900
         }
       ],
       "security": { "csp": null }
     },
     "bundle": {
       "active": true,
       "targets": "all",
       "icon": [
         "icons/32x32.png",
         "icons/128x128.png",
         "icons/128x128@2x.png",
         "icons/icon.icns",
         "icons/icon.ico"
       ],
       "macOS": {
         "signingIdentity": "-"
       }
     }
   }
   ```

   `signingIdentity: "-"` is the official ad-hoc identity ([macOS Code Signing — Ad-Hoc](https://v2.tauri.app/distribute/sign/macos/#ad-hoc-signing)). Without it, Apple Silicon downloads from GitHub are treated as damaged.

6. Copy `src-tauri/.gitignore` from the official template (`/target/`, `/gen/schemas`). Do not gitignore `src-tauri/` itself — `tauri-action` `projectPath` must not be gitignored.

7. If `init` added `tauri-plugin-opener` (create-tauri-app does; `tauri init` may), **remove it** unless you also add `@tauri-apps/plugin-opener` and a capability. This app must not depend on unused plugins.

**Docs / copy-from**

- Init flags + prompts: https://v2.tauri.app/start/create-project/ § Manual Setup
- Vite hooks: https://v2.tauri.app/start/frontend/vite/ (`frontendDist: "../dist"`, `devUrl: http://localhost:5173`)
- Config keys: https://v2.tauri.app/reference/config/
- Template JSON: create-tauri-app `templates/_base_/src-tauri/%(v2)%tauri.conf.json.lte`
- Ad-hoc sign: https://v2.tauri.app/distribute/sign/macos/#ad-hoc-signing
- Commit `Cargo.lock`: https://v2.tauri.app/develop/configuration-files/

**Verification**

- `test -f src-tauri/tauri.conf.json && test -f src-tauri/Cargo.toml`
- `rg '"frontendDist"' src-tauri/tauri.conf.json` → `../dist`
- `rg 'distDir|devPath|"package"' src-tauri` → no v1 keys
- `rg tauri-plugin src-tauri` → none (or only if you can justify each)
- `npx tauri info` prints Tauri 2 + the Vite project (needs Rust locally; if Rust is missing, note it and continue — CI installs Rust)

**Anti-patterns**

- Do not run `create-tauri-app` over this frontend.
- Do not add Rust commands or invoke `@tauri-apps/api` from React.
- Do not change `downloadProject` / `loadBundledPack`.
- Do not set `bundle.active` false.

---

## Phase 2 — Vite config: keep `/backpack/` for the web, root for Tauri

**What to implement**

`vite.config.ts` today is only `base: '/backpack/'` + React + Vitest. A `tauri build` embeds `dist/` and serves it at the app origin root. The current baked URLs (`/backpack/assets/...`, `/backpack/fixtures/packs/...`) will 404 inside the desktop app (`dist/index.html` already shows this).

Official Tauri Vite docs do **not** require `base: './'`. They **do** document `TAURI_ENV_PLATFORM` on `beforeBuildCommand`. Use that documented env to switch `base` without breaking the existing web deploy.

Replace `vite.config.ts` with the official Vite guide options **merged** into the existing file (keep `base` logic, `@vitejs/plugin-react`, and the `test` block):

```ts
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
```

Do **not** copy the official `build.target: chrome105 / safari13` block unless you verify it against this repo’s Vite 8. The Vite guide is “accurate as of Vite 5.4.8”; this repo is Vite `^8.2.0`. The keys above (`clearScreen`, `strictPort`, `watch.ignored`, `envPrefix`, `TAURI_DEV_HOST`) are still in the current guide.

Keep `src/io/packFs.ts` as-is. It already reads `import.meta.env.BASE_URL`. After a Tauri build, `BASE_URL` will be `/` and fixture fetches become `/fixtures/packs/...`, which matches files copied from `public/`.

**Docs / copy-from**

- Vite server / `TAURI_DEV_HOST` / `envPrefix`: https://v2.tauri.app/start/frontend/vite/
- `TAURI_ENV_*` set on hooks: https://v2.tauri.app/reference/config/ (`beforeBuildCommand`)
- Existing `BASE_URL` consumer: `src/io/packFs.ts:583-608`
- Existing test block: `vite.config.ts:9-12`

**Verification**

- `TAURI_ENV_PLATFORM=linux npm run build` then `rg '/backpack/' dist/index.html` → **no hits**. `rg 'href="/assets|src="/assets' dist/index.html` → hits.
- Unset env: `npm run build` then `rg '/backpack/' dist/index.html` → favicon + hashed assets still prefixed (web path unchanged).
- `npm test` still green (tests use `node:fs` + `public/fixtures`, not `BASE_URL`).

**Anti-patterns**

- Do not change `base` to `'/'` unconditionally (breaks `/backpack/` hosting).
- Do not hardcode a second fetch base inside `packFs.ts`.
- Do not switch the official `devUrl` to port 1420 (that is only the create-tauri-app template). This app already uses 5173; the Vite guide’s example is 5173.
- Do not add `HashRouter`.

---

## Phase 3 — Icons + local desktop smoke

**What to implement**

1. Source icon: square PNG or SVG with transparency. Prefer `public/favicon.svg` or a 1024×1024 export of the backpack LED mark. Official command ([App Icons](https://v2.tauri.app/develop/icons/)):

   ```bash
   npx tauri icon public/favicon.svg
   ```

   Output lands in `src-tauri/icons/` (`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`). Those paths must match `bundle.icon` from Phase 1.

   If `favicon.svg` is too simple, generate a square PNG first and pass that path. Do not ship the default Tauri logo (official icons page: “This is NOT what you want when you ship”).

2. Local Linux smoke (this workspace is Linux). Install prereqs from [Prerequisites — Debian](https://v2.tauri.app/start/prerequisites/) if missing:

   ```bash
   sudo apt install libwebkit2gtk-4.1-dev build-essential \
     libssl-dev libayatana-appindicator3-dev librsvg2-dev \
     libxdo-dev curl wget file
   ```

   Then:

   ```bash
   npm test
   npx tauri build
   ```

   Confirm files under `src-tauri/target/release/bundle/{appimage,deb,rpm}/`.

3. Optional: `npx tauri dev` opens a window on `http://localhost:5173` via `beforeDevCommand`. First load must still import stock via `loadBundledPack('stock')`.

**Docs / copy-from**

- `tauri icon`: https://v2.tauri.app/develop/icons/ and CLI `#icon`
- Linux deps: https://v2.tauri.app/start/prerequisites/
- `tauri build`: https://v2.tauri.app/distribute/

**Verification**

- `ls src-tauri/icons/icon.ico src-tauri/icons/icon.icns src-tauri/icons/128x128.png`
- After `tauri build`: at least one of `.AppImage` / `.deb` exists.
- Launch the AppImage (or `src-tauri/target/release/vector-backpack-studio` — actual binary name comes from Cargo). Import → Load stock Anki still fetches fixtures.
- `npm test` green.

**Anti-patterns**

- Do not leave default Tauri icons in a published release.
- Do not add Android/iOS icon trees (`src-tauri/gen/...`) — mobile is out of scope.
- Do not run `tauri build` as the only web build in README (keep `npm run build` for `/backpack/`).

---

## Phase 4 — GitHub Actions publish workflow

**What to implement**

Create `.github/workflows/publish.yml` by **copying** the official example on [Distribute → GitHub](https://v2.tauri.app/distribute/pipelines/github/) § Example Workflow, then apply only the documented extras below.

Copy this file (official YAML + the two allowed edits: npm cache already in the official snippet; add test/lint as the official page explicitly allows):

```yaml
name: 'publish'

on:
  workflow_dispatch:
  push:
    branches:
      - release
    tags:
      - 'app-v*'

jobs:
  publish-tauri:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest'
            args: '--target x86_64-apple-darwin'
          - platform: 'ubuntu-22.04'
            args: ''
          - platform: 'ubuntu-22.04-arm' # public repos only
            args: ''
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v7

      - name: install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-22.04' || matrix.platform == 'ubuntu-22.04-arm'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf xdg-utils

      - name: setup node
        uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: 'npm'

      - name: install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

      - name: install frontend dependencies
        run: npm ci

      - name: test and lint
        run: |
          npm test
          npm run lint

      - uses: tauri-apps/tauri-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: app-v__VERSION__
          releaseName: 'Vector Backpack Studio v__VERSION__'
          releaseBody: 'See the assets to download this version and install.'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

Allowed deltas from the official snippet (each is documented):

| Change | Why it is allowed |
|---|---|
| `tags: ['app-v*']` added next to the `release` branch | Official “How to Trigger” example |
| `npm ci` instead of `npm install` | lockfile already exists (`package-lock.json`) |
| `npm test` + `npm run lint` before the action | Official page: “You may freely modify the workflow … add more steps such as `npm run lint` or `npm run test`.” |
| `releaseName` branded | Official `releaseName` input; `__VERSION__` still required |

Keep `releaseDraft: true` (official default in the example). The action finds-or-creates **one** draft for `app-v__VERSION__` and each matrix job uploads its bundles. Publish the draft in the GitHub UI when the assets look right.

If the GitHub repo is **private**, delete the `ubuntu-22.04-arm` matrix row (official comment: only on public repos).

**Do not** add `softprops/action-gh-release` in parallel — `tauri-action` already creates the release. Do not add a second “create release” job (race on `POST /releases`).

**Docs / copy-from**

- Full workflow: https://v2.tauri.app/distribute/pipelines/github/
- Action inputs: https://github.com/tauri-apps/tauri-action README / `action.yml`
- Ubuntu packages in that YAML (WebKitGTK **4.1**, not 4.0)
- `contents: write`: GitHub workflow-syntax table + Tauri token troubleshooting
- Extra lint/test steps: same Tauri GitHub page, “Configuration”

**Verification**

- File exists at `.github/workflows/publish.yml`.
- `rg 'tauri-apps/tauri-action@v1' .github` → one hit.
- `rg 'webkit2gtk-4.0|tauri-action@v0|includeUpdaterJson|actions-rs' .github` → no hits.
- `rg 'contents: write' .github/workflows/publish.yml` → present.
- After push to GitHub: Actions tab shows `publish`. Run **workflow_dispatch**, or push branch `release`, or tag `app-v0.1.0`.
- Draft release `app-v0.1.0` contains Linux + Windows + macOS assets. Open it, then **Publish release**.

**Anti-patterns**

- Do not copy the Windows-signing page’s GHA snippet (`tauri-action@v0`, `webkit2gtk-4.0`, Node 12).
- Do not set `releaseDraft: false` on the first landing — a failed matrix job must not publish a half-empty latest release. Official example is draft.
- Do not omit `GITHUB_TOKEN`.
- Do not use `ubuntu-latest` for Linux (official v2 matrix is `ubuntu-22.04` so WebKitGTK 4.1 / glibc stay pinned).
- Do not add updater secrets or `createUpdaterArtifacts` in this phase.

---

## Phase 5 — README + version notes

**What to implement**

Update `README.md` (do not rewrite it). Add a **Desktop** section after Quick start:

```markdown
## Desktop builds

Native installers (Linux AppImage/deb/rpm, Windows MSI/NSIS, macOS DMG) are
produced by Tauri 2 in GitHub Actions and attached to a **draft** GitHub Release.

```bash
# local (needs Rust + platform webview deps — see https://v2.tauri.app/start/prerequisites/)
npm install
npm run tauri dev      # window + Vite on :5173
npm run tauri build    # installers under src-tauri/target/release/bundle/
```

CI: push branch `release`, tag `app-v*`, or run the `publish` workflow.
Version is `src-tauri/tauri.conf.json` → `version` (currently `0.1.0`).
The action tags `app-v__VERSION__`. Publish the draft in the GitHub Releases UI.

The web SPA is unchanged: `npm run build` still emits `/backpack/` assets.
`tauri build` sets `TAURI_ENV_PLATFORM` so the same Vite config emits `/`.
```

Also add `"tauri": "tauri"` to the Quick start script list if you mention it there.

Bump `package.json` `"version"` to `0.1.0` **only if** you pointed `tauri.conf.json` `version` at `../package.json`. Prefer keeping version in `tauri.conf.json` (official distribute page). Do not invent a changelog.

**Docs / copy-from**

- Version source: https://v2.tauri.app/distribute/ § Versioning
- Triggers: https://v2.tauri.app/distribute/pipelines/github/ § How to Trigger

**Verification**

- README no longer says only “no Tauri/Electron in v1” without a desktop section. Keep the “offline SPA” description; desktop is a wrap, not a rewrite.
- `rg 'no Tauri/Electron in v1' README.md` — either removed or qualified.

**Anti-patterns**

- Do not document Electron commands.
- Do not tell users to change Vite `base` by hand.

---

## Phase 6 — Verification

**What to run**

```bash
npm test
npm run lint
npx tsc -b --pretty false

# web path still prefixed
npm run build
rg '/backpack/' dist/index.html   # must still match

# desktop path unprefixed (env the official hook sets)
TAURI_ENV_PLATFORM=linux npm run build
rg '/backpack/' dist/index.html   # must be empty

# if Rust + webkit are installed
npx tauri info
npx tauri build
```

On GitHub, after the remote exists:

1. Push `master` with `src-tauri/` + `.github/workflows/publish.yml`.
2. Actions → `publish` → Run workflow (`workflow_dispatch`).
3. Confirm five matrix jobs (or four if private / no arm runner).
4. Confirm a **draft** release `app-v0.1.0` with:
   - Linux: `.AppImage`, `.deb`, `.rpm` (x64; arm64 if public)
   - Windows: `.msi`, `-setup.exe`
   - macOS: `.dmg` for `aarch64` and `x86_64`
5. Download the Linux AppImage, open it, Load stock Anki, Save project, Export zip.
6. Publish the draft when assets are complete.

**Checklist**

- [ ] `src-tauri/tauri.conf.json` is v2 (`frontendDist`, top-level `identifier`, `bundle.active: true`).
- [ ] No `@tauri-apps/api` usage in `src/`.
- [ ] `base` is `/backpack/` for web and `/` when `TAURI_ENV_PLATFORM` is set.
- [ ] `loadBundledPack` still uses `import.meta.env.BASE_URL` only.
- [ ] Icons are not the default Tauri logo.
- [ ] Workflow is `tauri-apps/tauri-action@v1` + `contents: write` + `ubuntu-22.04` + WebKit 4.1.
- [ ] No `tauri-action@v0`, no `webkit2gtk-4.0`, no `includeUpdaterJson`.
- [ ] Draft release created; publishing is a human click (or a later plan).
- [ ] `npm test` / `npm run lint` still run in CI before the desktop build.

**Anti-patterns**

- Do not claim the pipeline works until a GitHub run has uploaded assets (this clone has no remote).
- Do not add updater JSON, notarization secrets, or Electron files “while you are here.”
- Do not treat workflow artifacts (`actions/upload-artifact`) as a GitHub Release. Users download from **Releases**.
