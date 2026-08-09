import { useMemo } from 'react';
import {
  patternCycleMs,
  samplePattern,
  type Pattern,
} from '../domain';
import { usePackStore } from '../store/packStore';
import styles from './Waveform.module.css';

const LED_NAMES = ['F', 'M', 'B'] as const;
const SAMPLES = 96;

function buildStrip(pattern: Pattern, led: 0 | 1 | 2, cycle: number): string {
  const stops: string[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t = (i / SAMPLES) * cycle;
    const colors = samplePattern(pattern, t);
    const c = colors[led];
    const pct = (i / SAMPLES) * 100;
    const next = ((i + 1) / SAMPLES) * 100;
    stops.push(
      `rgb(${c.r},${c.g},${c.b}) ${pct.toFixed(2)}%`,
      `rgb(${c.r},${c.g},${c.b}) ${next.toFixed(2)}%`
    );
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

export function Waveform() {
  const { pattern, state } = usePackStore();

  const cycle = pattern ? patternCycleMs(pattern) : 2000;
  const playhead = cycle > 0 ? (state.timeMs % cycle) / cycle : 0;

  const strips = useMemo(() => {
    if (!pattern) return null;
    return ([0, 1, 2] as const).map((led) => buildStrip(pattern, led, cycle));
  }, [pattern, cycle]);

  if (!pattern || !strips) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>Load a pattern to see waveforms</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Timeline · per LED</div>
      {LED_NAMES.map((name, i) => (
        <div key={name} className={styles.row}>
          <span className={styles.ledName}>{name}</span>
          <div className={styles.track}>
            <div
              className={styles.strip}
              style={{ background: strips[i] }}
            />
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
