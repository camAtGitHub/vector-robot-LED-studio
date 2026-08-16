import { useRef } from 'react';
import {
  downloadPackAsZip,
  hasSentinels,
  importPackFromBrowserFiles,
  importPackFromZip,
  loadBundledPack,
  validatePack,
} from '../io';
import {
  downloadProject,
  hueShiftPack,
  brightnessPack,
  parseProjectJson,
} from '../domain';
import { usePackStore } from '../store/packStore';
import styles from './Header.module.css';

export function Header() {
  const { state, dispatch, applyImport, runBusy } = usePackStore();
  const folderRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);

  const pack = state.pack;
  const busy = state.busy;

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden>
          ▣
        </span>
        <div>
          <h1 className={styles.title}>Vector Robot LED Backpack Studio</h1>
          <p className={styles.subtitle}>
            {pack
              ? pack.name
              : 'Vector 3-LED ops lab · robot math preview'}
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <div className={`${styles.menu} ${styles.menuStart}`}>
          <button type="button" className={styles.btn} disabled={busy}>
            Import ▾
          </button>
          <div className={styles.dropdown}>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runBusy(async () => {
                  applyImport(await loadBundledPack('stock'), 'Stock Anki');
                })
              }
            >
              Load stock Anki
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runBusy(async () => {
                  applyImport(await loadBundledPack('example-cyan'), 'Example cyan');
                })
              }
            >
              Load example cyan
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runBusy(async () => {
                  applyImport(await loadBundledPack('wireos'), 'WireOS');
                })
              }
            >
              Load WireOS
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runBusy(async () => {
                  applyImport(
                    await loadBundledPack('cams-custom'),
                    "Cam's Custom Pack"
                  );
                })
              }
            >
              Load Cam's Custom Pack
            </button>
            <button type="button" disabled={busy} onClick={() => folderRef.current?.click()}>
              Import folder…
            </button>
            <button type="button" disabled={busy} onClick={() => zipRef.current?.click()}>
              Import zip…
            </button>
            <button type="button" disabled={busy} onClick={() => projectRef.current?.click()}>
              Open project…
            </button>
          </div>
        </div>

        <div className={`${styles.menu} ${styles.menuStart}`}>
          <button type="button" className={styles.btn} disabled={busy || !pack}>
            Export ▾
          </button>
          <div className={styles.dropdown}>
            <button
              type="button"
              disabled={busy || !pack}
              onClick={() =>
                runBusy(async () => {
                  if (!pack) return;
                  const force = !hasSentinels(pack);
                  if (force) {
                    const ok = window.confirm(
                      'Sentinels missing. Export incomplete pack anyway?'
                    );
                    if (!ok) return;
                  }
                  await downloadPackAsZip(pack, undefined, { force });
                  dispatch({
                    type: 'MARK_CLEAN',
                    status: `Exported robot zip (${Object.keys(pack.patterns).length} files)`,
                  });
                })
              }
            >
              Robot zip (customBackpackLights)
            </button>
            <button
              type="button"
              disabled={busy || !pack}
              onClick={() => {
                if (!pack) return;
                downloadProject(pack);
                dispatch({
                  type: 'MARK_CLEAN',
                  status: 'Downloaded project (.bpld.json)',
                });
              }}
            >
              Save project file
            </button>
          </div>
        </div>

        <div className={`${styles.menu} ${styles.menuEnd}`}>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={busy || !pack}
          >
            Save<span className={styles.saveExtra}> project</span> ▾
          </button>
          <div className={styles.dropdown}>
            <button
              type="button"
              disabled={busy || !pack}
              onClick={() => dispatch({ type: 'SET_RENAME', open: true })}
            >
              Rename project
            </button>
            <button
              type="button"
              disabled={busy || !pack}
              onClick={() => {
                if (!pack) return;
                downloadProject(pack);
                dispatch({
                  type: 'MARK_CLEAN',
                  status: 'Project saved (download)',
                });
              }}
            >
              Save project
            </button>
          </div>
        </div>

        <div className={`${styles.menu} ${styles.menuEnd}`}>
          <button type="button" className={styles.btn} disabled={busy || !pack}>
            Adjust ▾
          </button>
          <div className={styles.dropdown}>
            <button
              type="button"
              disabled={!pack}
              onClick={() => {
                if (!pack) return;
                const next = hueShiftPack(pack, 30);
                dispatch({
                  type: 'SET_PACK',
                  pack: next,
                  report: validatePack(next),
                });
                dispatch({ type: 'CLEAR_UNDO' });
                dispatch({ type: 'SET_STATUS', status: 'Hue +30° on whole pack' });
              }}
            >
              Hue-shift pack +30°
            </button>
            <button
              type="button"
              disabled={!pack}
              onClick={() => {
                if (!pack) return;
                const next = hueShiftPack(pack, -30);
                dispatch({
                  type: 'SET_PACK',
                  pack: next,
                  report: validatePack(next),
                });
                dispatch({ type: 'CLEAR_UNDO' });
                dispatch({ type: 'SET_STATUS', status: 'Hue −30° on whole pack' });
              }}
            >
              Hue-shift pack −30°
            </button>
            <button
              type="button"
              disabled={!pack}
              onClick={() => {
                if (!pack) return;
                const next = brightnessPack(pack, 0.85);
                dispatch({
                  type: 'SET_PACK',
                  pack: next,
                  report: validatePack(next),
                });
                dispatch({ type: 'CLEAR_UNDO' });
                dispatch({ type: 'SET_STATUS', status: 'Brightness ×0.85' });
              }}
            >
              Dim pack ×0.85
            </button>
            <button
              type="button"
              disabled={!pack}
              onClick={() => {
                if (!pack) return;
                const next = brightnessPack(pack, 1.15);
                dispatch({
                  type: 'SET_PACK',
                  pack: next,
                  report: validatePack(next),
                });
                dispatch({ type: 'CLEAR_UNDO' });
                dispatch({ type: 'SET_STATUS', status: 'Brightness ×1.15' });
              }}
            >
              Brighten pack ×1.15
            </button>
          </div>
        </div>

        <button
          type="button"
          className={styles.btn}
          onClick={() => dispatch({ type: 'SET_ABOUT', open: true })}
        >
          About
        </button>
      </div>

      <input
        ref={folderRef}
        type="file"
        className={styles.hidden}
        // @ts-expect-error webkitdirectory non-standard
        webkitdirectory=""
        directory=""
        multiple
        onChange={(e) => {
          const files = e.target.files;
          if (!files?.length) return;
          void runBusy(async () => {
            applyImport(
              await importPackFromBrowserFiles(files, { name: 'folder-import' }),
              'Folder import'
            );
          });
          e.target.value = '';
        }}
      />
      <input
        ref={zipRef}
        type="file"
        className={styles.hidden}
        accept=".zip,application/zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void runBusy(async () => {
            const buf = await file.arrayBuffer();
            applyImport(
              await importPackFromZip(buf, {
                name: file.name.replace(/\.zip$/i, ''),
              }),
              'Zip import'
            );
          });
          e.target.value = '';
        }}
      />
      <input
        ref={projectRef}
        type="file"
        className={styles.hidden}
        accept=".json,.bpld.json,application/json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void runBusy(async () => {
            const text = await file.text();
            const packDoc = parseProjectJson(text);
            const report = validatePack(packDoc);
            applyImport({ pack: packDoc, report }, 'Project load');
          });
          e.target.value = '';
        }}
      />
    </header>
  );
}
