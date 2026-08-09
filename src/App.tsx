import { useCallback, useState } from 'react';
import type { Pack } from './domain';
import {
  downloadPackAsZip,
  hasSentinels,
  importPackFromBrowserFiles,
  importPackFromZip,
  loadBundledPack,
  newPackFromStock,
  type ImportResult,
  type PackValidationReport,
} from './io';

function App() {
  const [pack, setPack] = useState<Pack | null>(null);
  const [report, setReport] = useState<PackValidationReport | null>(null);
  const [status, setStatus] = useState<string>('No pack loaded');
  const [busy, setBusy] = useState(false);

  const applyImport = useCallback((result: ImportResult, label: string) => {
    setPack(result.pack);
    setReport(result.report);
    const errCount = result.report.issues.filter(
      (i) => i.severity === 'error'
    ).length;
    const warnCount = result.report.issues.filter(
      (i) => i.severity === 'warning'
    ).length;
    setStatus(
      `${label}: ${result.report.patternCount}/${result.report.expectedCount} patterns` +
        (errCount ? ` · ${errCount} error(s)` : '') +
        (warnCount ? ` · ${warnCount} warning(s)` : '') +
        (hasSentinels(result.pack) ? ' · sentinels ok' : ' · sentinels missing')
    );
  }, []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 720 }}>
      <h1>Backpack Lights Designer — Phase 2</h1>
      <p style={{ color: '#555' }}>
        Pack import/export ready. Full mock-up UI arrives in Phase 3.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              applyImport(await newPackFromStock('My pack'), 'New from stock');
            })
          }
        >
          New from stock
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              applyImport(await loadBundledPack('stock'), 'Stock');
            })
          }
        >
          Load stock
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              applyImport(await loadBundledPack('example-cyan'), 'Example cyan');
            })
          }
        >
          Load cyan example
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              applyImport(await loadBundledPack('wireos'), 'WireOS');
            })
          }
        >
          Load WireOS
        </button>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 14 }}>Import folder</span>
          <input
            type="file"
            // @ts-expect-error webkitdirectory is non-standard but widely supported
            webkitdirectory=""
            directory=""
            multiple
            disabled={busy}
            onChange={(e) => {
              const files = e.target.files;
              if (!files?.length) return;
              void run(async () => {
                applyImport(
                  await importPackFromBrowserFiles(files, { name: 'folder-import' }),
                  'Folder import'
                );
              });
              e.target.value = '';
            }}
          />
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 14 }}>Import zip</span>
          <input
            type="file"
            accept=".zip,application/zip"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void run(async () => {
                const buf = await file.arrayBuffer();
                applyImport(
                  await importPackFromZip(buf, { name: file.name.replace(/\.zip$/i, '') }),
                  'Zip import'
                );
              });
              e.target.value = '';
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy || !pack}
          onClick={() =>
            run(async () => {
              if (!pack) return;
              await downloadPackAsZip(pack);
              setStatus(`Exported ${pack.name}.zip (${Object.keys(pack.patterns).length} files)`);
            })
          }
        >
          Export zip
        </button>
      </div>

      <p>
        <strong>Status:</strong> {busy ? 'Working…' : status}
      </p>

      {pack && (
        <section style={{ marginTop: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem' }}>
            Pack: {pack.name}{' '}
            <span style={{ fontWeight: 400, color: '#666' }}>
              ({Object.keys(pack.patterns).length} patterns
              {pack.dirty ? ', dirty' : ''})
            </span>
          </h2>
          <ul
            style={{
              maxHeight: 240,
              overflow: 'auto',
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              background: '#f6f6f6',
              padding: '0.75rem 1.25rem',
              borderRadius: 6,
            }}
          >
            {Object.keys(pack.patterns)
              .sort()
              .map((p) => (
                <li key={p}>{p}</li>
              ))}
          </ul>
        </section>
      )}

      {report && report.issues.length > 0 && (
        <section style={{ marginTop: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem' }}>Validation</h2>
          <ul style={{ fontSize: 14 }}>
            {report.issues.map((issue, i) => (
              <li
                key={`${issue.code}-${issue.path ?? ''}-${i}`}
                style={{ color: issue.severity === 'error' ? '#a00' : '#a60' }}
              >
                [{issue.severity}] {issue.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export default App;
