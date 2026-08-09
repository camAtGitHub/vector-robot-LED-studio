import { patternCycleMs } from '../domain';
import { usePackStore } from '../store/packStore';
import styles from './Transport.module.css';

const SPEEDS = [0.25, 0.5, 1, 1.5, 2] as const;

export function Transport() {
  const { state, pattern, dispatch, setTimeMs, timeMsRef } = usePackStore();
  const cycle = pattern ? patternCycleMs(pattern) : 2000;
  const t = state.timeMs;
  const displayT = t % Math.max(cycle, 1);

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
          {(displayT / 1000).toFixed(2)}s
          <span className={styles.cycle}> / {(cycle / 1000).toFixed(2)}s</span>
        </span>
        <input
          type="range"
          min={0}
          max={cycle}
          step={1}
          value={Math.min(displayT, cycle)}
          onChange={(e) => {
            const v = Number(e.target.value);
            // Preserve full timeline when scrubbing within one cycle window
            const base = Math.floor(timeMsRef.current / cycle) * cycle;
            const next = base + v;
            timeMsRef.current = next;
            setTimeMs(next);
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
