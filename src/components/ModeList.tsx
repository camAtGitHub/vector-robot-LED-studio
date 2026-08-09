import { useMemo, useState } from 'react';
import {
  getAllModes,
  type ModeDef,
  type ModeGroup,
  type Pattern,
} from '../domain';
import { usePackStore } from '../store/packStore';
import styles from './ModeList.module.css';

type Readiness = 'ok' | 'missing' | 'invalid';

function modeReadiness(
  mode: ModeDef,
  patterns: Record<string, Pattern> | undefined,
  schemaErrors: { path: string }[]
): Readiness {
  if (!patterns || !(mode.relativePath in patterns)) return 'missing';
  if (schemaErrors.some((e) => e.path === mode.relativePath)) return 'invalid';
  return 'ok';
}

const GROUP_ORDER: ModeGroup[] = ['Critical', 'Behavior', 'Utility'];
const GROUP_LABEL: Record<ModeGroup, string> = {
  Critical: 'Critical / system',
  Behavior: 'Behavior / freeplay',
  Utility: 'Always / utility',
};

export function ModeList() {
  const { state, selectMode, dispatch } = usePackStore();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<ModeGroup, boolean>>({
    Critical: false,
    Behavior: false,
    Utility: false,
  });

  const modes = useMemo(() => getAllModes(), []);
  const schemaErrors = state.report?.schemaErrors ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modes;
    return modes.filter((m) => {
      const hay = [
        m.label,
        m.cladEvent,
        m.animName,
        m.relativePath,
        m.group,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [modes, query]);

  const byGroup = useMemo(() => {
    const map: Record<ModeGroup, ModeDef[]> = {
      Critical: [],
      Behavior: [],
      Utility: [],
    };
    for (const m of filtered) {
      map[m.group].push(m);
    }
    return map;
  }, [filtered]);

  return (
    <aside className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Modes</h2>
        <span className={styles.count}>
          {filtered.length}/{modes.length}
        </span>
      </div>
      <input
        type="search"
        className={styles.search}
        placeholder="Search modes, spinner purple…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search modes"
      />
      <div className={styles.tools}>
        <button
          type="button"
          className={styles.toolBtn}
          disabled={!state.pack}
          onClick={() => dispatch({ type: 'COPY_PATTERN' })}
          title="Copy current mode pattern"
        >
          Copy
        </button>
        <button
          type="button"
          className={styles.toolBtn}
          disabled={!state.pack || !state.patternClipboard}
          onClick={() => dispatch({ type: 'PASTE_PATTERN' })}
          title="Paste pattern onto selected mode"
        >
          Paste
        </button>
      </div>
      <div className={styles.list}>
        {GROUP_ORDER.map((group) => {
          const items = byGroup[group];
          if (items.length === 0) return null;
          const isCollapsed = collapsed[group];
          return (
            <div key={group} className={styles.group}>
              <button
                type="button"
                className={styles.groupHead}
                onClick={() =>
                  setCollapsed((c) => ({ ...c, [group]: !c[group] }))
                }
              >
                <span className={styles.chevron}>{isCollapsed ? '▸' : '▾'}</span>
                {GROUP_LABEL[group]}
                <span className={styles.groupCount}>{items.length}</span>
              </button>
              {!isCollapsed &&
                items.map((mode) => {
                  const ready = modeReadiness(
                    mode,
                    state.pack?.patterns,
                    schemaErrors
                  );
                  const selected = mode.cladEvent === state.selectedCladEvent;
                  return (
                    <button
                      key={mode.cladEvent}
                      type="button"
                      className={`${styles.row} ${selected ? styles.selected : ''}`}
                      onClick={() => selectMode(mode.cladEvent)}
                    >
                      <span className={styles.rowMain}>
                        <span className={styles.label}>{mode.label}</span>
                        <span className={styles.meta}>
                          {mode.cladEvent} · {mode.relativePath.split('/').pop()}
                        </span>
                      </span>
                      <span
                        className={`${styles.chip} ${styles[ready]}`}
                        title={ready}
                      >
                        {ready}
                      </span>
                    </button>
                  );
                })}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className={styles.empty}>No modes match “{query}”</p>
        )}
      </div>
    </aside>
  );
}
