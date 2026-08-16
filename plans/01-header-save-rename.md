# Plan: Remove New from stock, rename Theme, Save dropdown + pack rename

Executable in new chats, in order. Copy existing APIs and UI shells; do not invent download/filename helpers.

---

## Phase 0 — Allowed APIs (discovery)

### What already exists (use these)

| Need | Existing API | Source |
|---|---|---|
| Project JSON + `name` field | `packToProject(pack)` → `ProjectFile.name = pack.name` | `src/domain/project.ts:20-31` |
| Download `.bpld.json` | `downloadProject(pack, filename?)` — default filename from `pack.name` | `src/domain/project.ts:88-105` |
| Robot zip filename | `downloadPackAsZip(pack)` → `${sanitizeFilename(pack.name)}.zip` | `src/io/packFs.ts:513-527` |
| Load stock without clone | `loadBundledPack('stock')` name `'Stock Anki'`, `dirty: false` | `src/io/packFs.ts:577-610` |
| Replace whole pack | `{ type: 'SET_PACK'; pack; report? }` — **does not** rewrite `name`/`dirty` | `src/store/packStore.tsx:140-143` |
| Dropdown chrome | `.menu` + `.dropdown` + `.menuStart` / `.menuEnd` hover/focus-within | `src/components/Header.tsx:44-103`, `Header.module.css:84-118` |
| Modal shell | `AboutModal` + `SET_ABOUT` / `aboutOpen` | `src/components/AboutModal.tsx:4-31`, `AboutModal.module.css` |
| Text field styling | `.favAdd input` | `src/components/PatternEditor.module.css:315-330` |
| Confirm-only native dialog | `window.confirm` (zip sentinels only) | `src/components/Header.tsx:118-121` |

### What does **not** exist (do not invent)

- No `window.prompt` anywhere — do not add one for rename.
- No `SET_PACK_NAME` yet — add this action; do **not** invent a new download function.
- No shared exported `sanitizeFilename` — zip has a private helper; project inlines a similar regex. Do not invent a third sanitizer unless you extract the existing zip one and reuse it.
- `dirty` does **not** block save/export. Leave that behavior. Do not add `beforeunload`.
- Robot zip JSON files do **not** contain pack name (only the download filename does). Do not stuff `name` into pattern JSON.

### Duplicate save paths (leave unless a later phase says otherwise)

- Header primary **Save project** and Export → **Save project file** both call `downloadProject(pack)` with different status strings (`Header.tsx:133-164`, `App.tsx:71-81` Ctrl/Cmd+S).
- After this plan, primary Save becomes a menu whose “Save project” item is the same `downloadProject` call. Leave Export’s “Save project file” in place.

### Label decision: Theme → **Adjust**

User suggested “Mods”. Plan default is **Adjust ▾**.

- Theme is wrong (not a color-scheme switcher).
- Mods sounds like firmware/game mods.
- Adjust matches hue-shift + brightness without overclaiming.

Swap the visible string to `Mods ▾` if preferred; no other logic change.

### Bootstrap note

`App.tsx` `BootstrapPack` currently calls `newPackFromStock('My pack')` (`App.tsx:100-112`). Removing the Import item is not enough — first load must switch to `loadBundledPack('stock')` or the app has no pack.

---

## Phase 1 — Remove “New from stock”

**What to implement**

1. Delete the Import menu button **New from stock** in `Header.tsx:49-59`. Keep **Load stock Anki** (`Header.tsx:60-70`).
2. In `App.tsx` `BootstrapPack`, copy the Load stock Anki call:
   `applyImport(await loadBundledPack('stock'), 'Stock Anki')`.
   Drop the `newPackFromStock` import; add `loadBundledPack` from `./io` if not already imported.
3. Delete `newPackFromStock` from `src/io/packFs.ts:615-621` if nothing else imports it.
4. If `clonePackAsEditable` (`packFs.ts:566-568`) is then unused, delete it too. Keep `createPack`.
5. Re-export check: `src/io/index.ts` is `export * from './packFs'` — unused exports disappearing is fine.

**Docs / copy-from**

- Replacement load: `loadBundledPack` at `packFs.ts:577-610` and Header L65.
- Do not keep a `dirty: true` clone path.

**Verification**

- `rg newPackFromStock` → no hits.
- `rg "New from stock"` → no hits (or only git history).
- `npm test` still green (`packFs.test.ts` uses `loadFixturePack` / `importPackFromFiles`, not `newPackFromStock`).

**Anti-patterns**

- Do not change **Load stock Anki**.
- Do not leave bootstrap calling a deleted function.
- Do not mark stock load dirty.

---

## Phase 2 — Theme button → Adjust

**What to implement**

In `Header.tsx:166-169`, change visible label `Theme ▾` to `Adjust ▾`. Menu items stay:

- Hue-shift pack +30° / −30°
- Dim pack ×0.85 / Brighten pack ×1.15

Keep `styles.menuEnd` so the menu still opens left (mobile overflow fix).

**Docs / copy-from**

- Menu structure: `Header.tsx:166-240`.
- Handlers already use `hueShiftPack` / `brightnessPack` (`themeTools.ts:33-48`).

**Verification**

- `rg "Theme ▾"` → no hits.
- `rg "Adjust ▾"` → Header trigger only.
- Items and dispatches unchanged (`SET_PACK`, `CLEAR_UNDO`, same status strings).

**Anti-patterns**

- Do not rename `themeTools.ts` or the functions (internal names are fine).
- Do not restyle or move the menu.

---

## Phase 3 — Pack rename in the store + project JSON

**What to implement**

1. Add action (same file as `SET_PACK`, `packStore.tsx:51-70`):

   ```ts
   | { type: 'SET_PACK_NAME'; name: string }
   ```

2. Reducer: if `!state.pack`, no-op. Else:

   ```ts
   const name = action.name.trim();
   if (!name) return state;
   return {
     ...state,
     pack: { ...state.pack, name, dirty: true },
   };
   ```

   Trim. Reject empty / whitespace-only. Set `dirty: true` (name change is a real edit; it affects downloads). Do **not** push undo (undo stack is patterns only — see `UPDATE_PATTERN` at `packStore.tsx:163-191`).

3. Confirm `packToProject` already writes `name: pack.name` (`project.ts:25-30`). No new serializer.

4. Add/extend tests in `src/domain/presets.test.ts` suite `project` (existing round-trip at L102-117 uses `name: 'Test neon'`):

   - `packToProject` on a pack whose `name` was changed includes the new name.
   - `parseProjectJson` / `projectToPack` restores that name.
   - Optional: filename string matches the same regex already inlined in `downloadProject` (`project.ts:93-95`). Do not mock `document` unless you already have a download test.

**Docs / copy-from**

- `Pack.name`: `types.ts:36-41`.
- `ProjectFile.name`: `project.ts:12-18`, `packToProject` L25-30, `projectToPack` L54-56 and L73.
- `SET_PACK` pass-through as the pattern for “replace fields on pack”: `packStore.tsx:140-143`.

**Verification**

- `npm test` — project round-trip still passes; new name test passes.
- `rg SET_PACK_NAME` → action + reducer only.

**Anti-patterns**

- Do not invent `downloadProjectAs` / `setPackName()` outside the reducer.
- Do not put `name` into robot pattern JSON (`exportPackToFileMap`).
- Do not clear `dirty` on save (existing behavior: save never clears dirty).

---

## Phase 4 — Rename modal UI

**What to implement**

1. Copy `AboutModal` shell (`AboutModal.tsx:4-31` + `AboutModal.module.css`) to `src/components/RenameProjectModal.tsx` + module CSS.

2. Store flag, copy `aboutOpen` / `SET_ABOUT`:

   ```ts
   renameOpen: boolean  // initial false
   | { type: 'SET_RENAME'; open: boolean }
   ```

3. Modal contents (not present on About — add a small form):

   - Title: Rename project
   - Text input, prefilled with `state.pack.name`, autofocus
   - Cancel → `SET_RENAME` false
   - Confirm → `SET_PACK_NAME` + `SET_RENAME` false + `SET_STATUS` e.g. `Renamed project to “…”`
   - Enter submits; Escape can close (About does not do Escape — optional)
   - Backdrop click closes like About
   - If `!state.pack` or `!renameOpen`, return `null`

4. Input styles: copy `.favAdd input` (`PatternEditor.module.css:315-330`). Buttons: copy Header `.btn` / `.btnPrimary` colors or About `.close` for cancel.

5. Mount next to About in `App.tsx` `Shell` (`App.tsx:115-128`).

**Docs / copy-from**

- Dialog markup/a11y: `role="dialog"`, `aria-modal`, labelled title, `stopPropagation` on panel — `AboutModal.tsx:9-18`.
- Open/close: Header About button `SET_ABOUT` at `Header.tsx:242-247`.

**Verification**

- Modal not in the tree when closed.
- Confirm with a new name updates `state.pack.name` (manual or a tiny reducer test if you extract the case).
- Empty submit does not change name.

**Anti-patterns**

- Do not use `window.prompt` or `window.confirm` for rename.
- Do not portal or add a dialog library.
- Do not require a filename extension in the input — user types a display name; sanitizing happens only at download time (existing `downloadProject` / `sanitizeFilename`).

---

## Phase 5 — Save project becomes a dropdown

**What to implement**

Replace the primary Save button (`Header.tsx:150-164`) with a menu copied from Export (`Header.tsx:105-148`) or Import:

- Trigger: still **Save project** (keep `.btnPrimary` + `.saveExtra` so ≤380px shows **Save**). `disabled={busy || !pack}`.
- Dropdown items:
  1. **Rename project** → `dispatch({ type: 'SET_RENAME', open: true })`
  2. **Save project** → existing `downloadProject(pack)` + status `'Project saved (download)'` (same as current primary button / Ctrl+S)

Alignment: use `styles.menuStart` like Export so the menu grows right on phones (Export is `menuStart` at L105). If it clips on the right next to Adjust, use `menuEnd` instead — match the same rule already in `Header.module.css:111-118`.

Ctrl/Cmd+S in `App.tsx:71-81` stays a direct save (no rename).

Optionally show `pack.name` in the header subtitle or validation bar so rename has visible feedback. Keep it one short line; `pack.name` is currently never rendered (`ValidationBar.tsx` only shows dirty).

**Docs / copy-from**

- Dropdown open behavior: CSS only, `Header.module.css:88-91`.
- Save download: `Header.tsx:150-164` (move that onClick onto the menu item).
- Mobile label: `Header.tsx:163` + `Header.module.css:177-181`.

**Verification**

- Hover/focus Save project → two items.
- Save project item downloads `.bpld.json` whose top-level `name` is the current pack name; filename uses the sanitized name.
- Rename project opens the modal; after rename, Save and Export zip use the new name.
- Import no longer lists New from stock.
- Adjust menu still right-aligned.

**Anti-patterns**

- Do not make the trigger itself download on click (it is a menu now).
- Do not remove Export → Save project file unless asked.
- Do not change robot zip contents.

---

## Phase 6 — Verification

**What to run**

```bash
rg newPackFromStock src
rg "New from stock" src
rg "Theme ▾" src
npm test
npx tsc -b --pretty false
```

**Checklist**

- [ ] First app load still imports stock via `loadBundledPack('stock')`.
- [ ] Import menu: Load stock Anki, example cyan, WireOS, folder, zip, open project — no New from stock.
- [ ] Adjust ▾: four hue/brightness items still work; menu stays on-screen on mobile.
- [ ] Save project ▾: Rename + Save; Save downloads `.bpld.json` with `name` set.
- [ ] Rename: empty rejected; trim applied; zip download filename and project `name` match.
- [ ] Dirty still only a footer label; stock load is not dirty; rename and pattern edits are dirty.
- [ ] Ctrl/Cmd+S still downloads the project file.
- [ ] No `window.prompt`.

**Anti-patterns**

- Do not add tests that call deleted `newPackFromStock`.
- Do not rewrite export/import I/O beyond unused-function deletion.
