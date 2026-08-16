import {
  patternWindowMs,
  previewPlayheadMs,
  previewTimerMs,
} from '../domain';
import { usePackStore } from '../store/packStore';
import styles from './Transport.module.css';

const SPEEDS = [0.25, 0.5, 1, 1.5, 2] as const;

export function Transport() {
  const { state, pattern, dispatch, setTimeMs, timeMsRef } = usePackStore();
  const window = pattern ? patternWindowMs(pattern) : 2000;
  const t = state.timeMs;
  const head = pattern ? previewPlayheadMs(t, pattern) : t % Math.max(window, 1);
  const timer = pattern
    ? previewTimerMs(t, pattern)
    : { valueMs: head, spanMs: window, phase: 'loop' as const };

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.play}
        onClick={() =>
          dispatch({ type: 'SET_PLAYING', playing: !state.playing })
        }
        aria-label={state.playing ? 'Pause' : 'Play'}
        title="Space to toggle"
      >
        {state.playing ? '⏸' : '▶'}
      </button>

      <div className={styles.speeds} role="group" aria-label="Playback speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.speedBtn} ${
              state.speed === s ? styles.speedActive : ''
            }`}
            onClick={() => dispatch({ type: 'SET_SPEED', speed: s })}
          >
            {s}×
          </button>
        ))}
      </div>

      <label className={styles.scrub}>
        <span className={styles.time}>
          {(timer.valueMs / 1000).toFixed(2)}s
          <span className={styles.cycle}>
            {` / ${(timer.spanMs / 1000).toFixed(2)}s ${
              timer.phase === 'delay' ? 'delay' : 'loop'
            }`}
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={window}
          step={1}
          value={Math.min(head, window)}
          onChange={(e) => {
            const v = Number(e.target.value);
            timeMsRef.current = v;
            setTimeMs(v);
            if (state.playing) {
              dispatch({ type: 'SET_PLAYING', playing: false });
            }
          }}
          aria-label="Scrub timeline"
        />
      </label>
    </div>
  );
}
