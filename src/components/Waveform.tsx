import { useMemo } from 'react';
import {
  patternIntroMs,
  patternWindowMs,
  previewPlayheadMs,
  samplePattern,
  type Pattern,
} from '../domain';
import { usePackStore } from '../store/packStore';
import styles from './Waveform.module.css';

const LED_NAMES = ['F', 'M', 'B'] as const;

function stripSamples(windowMs: number): number {
  return Math.min(240, Math.max(96, Math.round(windowMs / 20)));
}

function buildStrip(pattern: Pattern, led: 0 | 1 | 2, cycle: number): string {
  const samples = stripSamples(cycle);
  const stops: string[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * cycle;
    const colors = samplePattern(pattern, t);
    const c = colors[led];
    const pct = (i / samples) * 100;
    const next = ((i + 1) / samples) * 100;
    stops.push(
      `rgb(${c.r},${c.g},${c.b}) ${pct.toFixed(2)}%`,
      `rgb(${c.r},${c.g},${c.b}) ${next.toFixed(2)}%`
    );
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

export function Waveform() {
  const { pattern, state } = usePackStore();

  const window = pattern ? patternWindowMs(pattern) : 2000;
  const intro = pattern ? patternIntroMs(pattern) : 0;
  const playhead =
    pattern && window > 0
      ? previewPlayheadMs(state.timeMs, pattern) / window
      : 0;

  const strips = useMemo(() => {
    if (!pattern) return null;
    return ([0, 1, 2] as const).map((led) =>
      buildStrip(pattern, led, window)
    );
  }, [pattern, window]);

  if (!pattern || !strips) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>Load a pattern to see waveforms</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Timeline · offset once, then loop</div>
      {LED_NAMES.map((name, i) => (
        <div key={name} className={styles.row}>
          <span className={styles.ledName}>{name}</span>
          <div className={styles.track}>
            <div
              className={styles.strip}
              style={{ background: strips[i] }}
            />
            {intro > 0 && window > 0 && (
              <div
                className={styles.loopStart}
                style={{ left: `${(intro / window) * 100}%` }}
                title="Offset wait ends; loop starts"
              />
            )}
            <div
              className={styles.playhead}
              style={{ left: `${playhead * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
