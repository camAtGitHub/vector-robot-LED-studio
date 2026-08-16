import { useEffect, useMemo, useState } from 'react';
import type { Pattern, Rgba } from '../domain';
import {
  applyPreset,
  clonePattern,
  hexToRgba,
  libraryPresets,
  parsePatternJson,
  rgbaToHex,
  rgbaToRgb255,
  rgb255ToRgba,
  SchemaError,
  stringifyPattern,
  type PresetId,
} from '../domain';
import { usePackStore } from '../store/packStore';
import styles from './PatternEditor.module.css';

const LED_NAMES = ['Front', 'Middle', 'Back'] as const;
const PERIOD_FIELDS = [
  { key: 'onPeriod_ms' as const, label: 'on_ms' },
  { key: 'offPeriod_ms' as const, label: 'off_ms' },
  { key: 'transitionOnPeriod_ms' as const, label: 'transOn' },
  { key: 'transitionOffPeriod_ms' as const, label: 'transOff' },
  { key: 'offset' as const, label: 'offset' },
];

const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'blink', label: 'Blink' },
  { id: 'breathe', label: 'Breathe' },
  { id: 'chase', label: 'Chase' },
  { id: 'single-front', label: 'Front only' },
  { id: 'single-middle', label: 'Mid only' },
  { id: 'single-back', label: 'Back only' },
];

function clampPeriod(n: number, isOffset: boolean): number {
  if (isOffset) {
    return Math.min(32767, Math.max(-32768, Math.round(n)));
  }
  return Math.min(65535, Math.max(0, Math.round(n)));
}

export function PatternEditor() {
  const {
    state,
    pattern,
    selectedMode,
    dispatch,
    updatePattern,
    starFavorite,
    applyFavorite,
    removeFavorite,
  } = usePackStore();

  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonDirty, setJsonDirty] = useState(false);
  const [favName, setFavName] = useState('');

  // Sync raw JSON from pattern when not dirty editing
  useEffect(() => {
    if (!pattern) {
      setJsonText('');
      setJsonError(null);
      setJsonDirty(false);
      return;
    }
    if (!jsonDirty) {
      setJsonText(stringifyPattern(pattern, true));
      setJsonError(null);
    }
  }, [pattern, jsonDirty, selectedMode?.cladEvent]);

  // Reset json dirty when mode changes
  useEffect(() => {
    setJsonDirty(false);
  }, [selectedMode?.cladEvent]);

  const baseColor = useMemo(() => {
    if (!pattern) return [0, 0.85, 1, 1] as Rgba;
    return pattern.onColors[0];
  }, [pattern]);

  if (!state.pack) {
    return (
      <aside className={styles.panel}>
        <div className={styles.empty}>Import or create a pack to edit patterns.</div>
      </aside>
    );
  }

  if (!pattern || !selectedMode) {
    return (
      <aside className={styles.panel}>
        <div className={styles.empty}>
          Pattern missing for this mode. Copy from another mode or load stock.
        </div>
      </aside>
    );
  }

  const setColor = (
    which: 'onColors' | 'offColors',
    led: 0 | 1 | 2,
    color: Rgba
  ) => {
    const next = clonePattern(pattern);
    const leds: (0 | 1 | 2)[] = state.linkLeds ? [0, 1, 2] : [led];
    for (const i of leds) {
      next[which][i] = [...color] as Rgba;
    }
    updatePattern(next);
  };

  const setPeriod = (
    key: (typeof PERIOD_FIELDS)[number]['key'],
    led: 0 | 1 | 2,
    value: number
  ) => {
    const next = clonePattern(pattern);
    const v = clampPeriod(value, key === 'offset');
    const leds: (0 | 1 | 2)[] = state.linkLeds ? [0, 1, 2] : [led];
    for (const i of leds) {
      next[key][i] = v;
    }
    updatePattern(next);
  };

  const applyJson = () => {
    try {
      const parsed = parsePatternJson(jsonText);
      updatePattern(parsed);
      setJsonError(null);
      setJsonDirty(false);
      dispatch({ type: 'SET_STATUS', status: 'Raw JSON applied' });
    } catch (e) {
      const msg =
        e instanceof SchemaError
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e);
      setJsonError(msg);
    }
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.heading}>Pattern editor</h2>
          <p className={styles.modeLine}>
            {selectedMode.label}
            <span className={styles.path}> · {selectedMode.relativePath}</span>
          </p>
        </div>
        <div className={styles.undoRedo}>
          <button
            type="button"
            disabled={state.undoStack.length === 0}
            onClick={() => dispatch({ type: 'UNDO' })}
            title="Undo"
          >
            ↶
          </button>
          <button
            type="button"
            disabled={state.redoStack.length === 0}
            onClick={() => dispatch({ type: 'REDO' })}
            title="Redo"
          >
            ↷
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        {(
          [
            ['fields', 'Fields'],
            ['presets', 'Presets'],
            ['favorites', 'Favorites'],
            ['json', 'Raw JSON'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.tab} ${
              state.editorTab === id ? styles.tabActive : ''
            }`}
            onClick={() => dispatch({ type: 'SET_EDITOR_TAB', tab: id })}
          >
            {label}
          </button>
        ))}
      </div>

      {state.editorTab === 'fields' && (
        <div className={styles.body}>
          <label className={styles.linkRow}>
            <input
              type="checkbox"
              checked={state.linkLeds}
              onChange={(e) =>
                dispatch({ type: 'SET_LINK_LEDS', link: e.target.checked })
              }
            />
            Link LEDs (edit all three)
          </label>

          <div className={styles.presets}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.presetBtn}
                onClick={() => updatePattern(applyPreset(p.id, baseColor))}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.grid}>
            <div className={`${styles.gridHead} ${styles.sticky}`}>LED</div>
            <div className={styles.gridHead}>On</div>
            <div className={styles.gridHead}>Off</div>
            {PERIOD_FIELDS.map((f) => (
              <div key={f.key} className={styles.gridHead}>
                {f.label}
              </div>
            ))}

            {LED_NAMES.map((name, ledIdx) => {
              const led = ledIdx as 0 | 1 | 2;
              const on = pattern.onColors[led];
              const off = pattern.offColors[led];
              const on255 = rgbaToRgb255(on);
              const off255 = rgbaToRgb255(off);
              return (
                <LedRow
                  key={name}
                  name={name}
                  on={on}
                  off={off}
                  on255={on255}
                  off255={off255}
                  pattern={pattern}
                  led={led}
                  onColorChange={(which, color) => setColor(which, led, color)}
                  onPeriodChange={(key, value) => setPeriod(key, led, value)}
                />
              );
            })}
          </div>

          <div className={styles.favBar}>
            <button
              type="button"
              className={styles.starBtn}
              onClick={() => starFavorite(selectedMode.label)}
            >
              ★ Favorite this pattern
            </button>
          </div>
        </div>
      )}

      {state.editorTab === 'json' && (
        <div className={styles.body}>
          <textarea
            className={styles.json}
            value={jsonText}
            spellCheck={false}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonDirty(true);
              setJsonError(null);
            }}
          />
          {jsonError && <div className={styles.jsonErr}>{jsonError}</div>}
          {!jsonError && jsonDirty && (
            <div className={styles.jsonHint}>
              Preview holds last good pattern until Apply.
            </div>
          )}
          <div className={styles.jsonActions}>
            <button type="button" className={styles.applyBtn} onClick={applyJson}>
              Apply JSON
            </button>
            <button
              type="button"
              className={styles.presetBtn}
              onClick={() => {
                setJsonText(stringifyPattern(pattern, true));
                setJsonDirty(false);
                setJsonError(null);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {state.editorTab === 'presets' && (
        <div className={styles.body}>
          <p className={styles.presetHint}>
            Built-in recipes — always here, not deletable. Star a result to keep
            your own color combo.
          </p>
          <ul className={styles.favList}>
            {libraryPresets().map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={styles.favApply}
                  onClick={() => {
                    updatePattern(clonePattern(p.pattern));
                    dispatch({
                      type: 'SET_STATUS',
                      status: `Applied preset “${p.name}”`,
                    });
                  }}
                  title="Apply to selected mode"
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.editorTab === 'favorites' && (
        <div className={styles.body}>
          <div className={styles.favAdd}>
            <input
              type="text"
              placeholder="Name for new favorite…"
              value={favName}
              onChange={(e) => setFavName(e.target.value)}
            />
            <button
              type="button"
              className={styles.starBtn}
              onClick={() => {
                starFavorite(favName || selectedMode.label);
                setFavName('');
              }}
            >
              ★ Star current
            </button>
          </div>
          <ul className={styles.favList}>
            {state.favorites.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className={styles.favApply}
                  onClick={() => applyFavorite(f.id)}
                  title="Apply to selected mode"
                >
                  {f.name}
                </button>
                <button
                  type="button"
                  className={styles.favDel}
                  onClick={() => removeFavorite(f.id)}
                  aria-label={`Remove ${f.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {state.favorites.length === 0 && (
            <p className={styles.empty}>No favorites yet.</p>
          )}
        </div>
      )}
    </aside>
  );
}

function LedRow({
  name,
  on,
  off,
  on255,
  off255,
  pattern,
  led,
  onColorChange,
  onPeriodChange,
}: {
  name: string;
  on: Rgba;
  off: Rgba;
  on255: { r: number; g: number; b: number; a: number };
  off255: { r: number; g: number; b: number; a: number };
  pattern: Pattern;
  led: 0 | 1 | 2;
  onColorChange: (which: 'onColors' | 'offColors', color: Rgba) => void;
  onPeriodChange: (
    key: (typeof PERIOD_FIELDS)[number]['key'],
    value: number
  ) => void;
}) {
  return (
    <>
      <div className={styles.ledName}>{name}</div>
      <ColorCell
        hex={rgbaToHex(on)}
        rgb={on255}
        onHex={(h) => {
          const c = hexToRgba(h, on[3]);
          if (c) onColorChange('onColors', c);
        }}
        onRgb={(r, g, b) =>
          onColorChange('onColors', rgb255ToRgba(r, g, b, on255.a))
        }
      />
      <ColorCell
        hex={rgbaToHex(off)}
        rgb={off255}
        onHex={(h) => {
          const c = hexToRgba(h, off[3]);
          if (c) onColorChange('offColors', c);
        }}
        onRgb={(r, g, b) =>
          onColorChange('offColors', rgb255ToRgba(r, g, b, off255.a))
        }
      />
      {PERIOD_FIELDS.map((f) => (
        <div key={f.key} className={styles.periodCell}>
          <input
            type="number"
            className={styles.num}
            min={f.key === 'offset' ? -32768 : 0}
            max={f.key === 'offset' ? 32767 : 65535}
            value={pattern[f.key][led]}
            onChange={(e) => onPeriodChange(f.key, Number(e.target.value))}
          />
          <input
            type="range"
            min={f.key === 'offset' ? 0 : 0}
            max={f.key === 'offset' ? 4000 : 4000}
            value={Math.min(
              4000,
              Math.max(0, pattern[f.key][led])
            )}
            onChange={(e) => onPeriodChange(f.key, Number(e.target.value))}
            aria-label={`${name} ${f.label} slider`}
          />
        </div>
      ))}
    </>
  );
}

function ColorCell({
  hex,
  rgb,
  onHex,
  onRgb,
}: {
  hex: string;
  rgb: { r: number; g: number; b: number; a: number };
  onHex: (hex: string) => void;
  onRgb: (r: number, g: number, b: number) => void;
}) {
  return (
    <div className={styles.colorCell}>
      <input
        type="color"
        value={hex.length === 7 ? hex : '#000000'}
        onChange={(e) => onHex(e.target.value)}
        aria-label="Color picker"
      />
      <input
        type="text"
        className={styles.hex}
        value={hex}
        onChange={(e) => onHex(e.target.value)}
        maxLength={7}
      />
      <div className={styles.rgbRow}>
        {(['r', 'g', 'b'] as const).map((ch) => (
          <input
            key={ch}
            type="number"
            min={0}
            max={255}
            value={rgb[ch]}
            title={ch.toUpperCase()}
            onChange={(e) => {
              const v = Number(e.target.value);
              onRgb(
                ch === 'r' ? v : rgb.r,
                ch === 'g' ? v : rgb.g,
                ch === 'b' ? v : rgb.b
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}
