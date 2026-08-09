import { useEffect, useRef } from 'react';
import { samplePattern, type Pattern, type Rgba8 } from '../domain';
import { usePackStore } from '../store/packStore';
import styles from './BackpackMockup.module.css';

function cssRgb(c: Rgba8): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

function lum(c: Rgba8): number {
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
}

function applyColors(
  els: Array<HTMLDivElement | null>,
  colors: [Rgba8, Rgba8, Rgba8]
): void {
  for (let i = 0; i < 3; i++) {
    const el = els[i];
    if (!el) continue;
    const c = colors[i];
    const L = lum(c);
    const color = cssRgb(c);
    el.style.backgroundColor = color;
    el.style.boxShadow =
      L < 0.02
        ? 'none'
        : `0 0 ${8 + L * 28}px ${2 + L * 10}px ${color},
           0 0 ${4 + L * 12}px ${color},
           inset 0 0 ${6 + L * 8}px rgba(255,255,255,${0.15 + L * 0.35})`;
    el.style.opacity = String(0.35 + L * 0.65);
  }
}

/**
 * 3-LED backpack mock-up. Colors come only from samplePattern (player math).
 * rAF updates DOM styles directly — pack state is not rewritten every frame.
 */
export function BackpackMockup() {
  const {
    patternRef,
    playingRef,
    speedRef,
    timeMsRef,
    setTimeMs,
    pattern,
    state,
  } = usePackStore();

  const frontRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const lastWallRef = useRef<number | null>(null);
  const localTimeRef = useRef(0);

  // Paint immediately when pattern changes, or when time is scrubbed while paused
  useEffect(() => {
    if (state.playing) return;
    localTimeRef.current = state.timeMs;
    timeMsRef.current = state.timeMs;
    const p = pattern;
    const els = [frontRef.current, midRef.current, backRef.current];
    if (p) {
      applyColors(els, samplePattern(p, state.timeMs));
    } else {
      applyColors(els, [
        { r: 0, g: 0, b: 0, a: 0 },
        { r: 0, g: 0, b: 0, a: 0 },
        { r: 0, g: 0, b: 0, a: 0 },
      ]);
    }
  }, [pattern, state.timeMs, state.playing, timeMsRef]);

  useEffect(() => {
    let raf = 0;
    let lastPublish = 0;

    const tick = (wall: number) => {
      const prev = lastWallRef.current;
      lastWallRef.current = wall;

      if (prev != null && playingRef.current) {
        const dt = (wall - prev) * speedRef.current;
        localTimeRef.current += dt;
        timeMsRef.current = localTimeRef.current;
      } else if (!playingRef.current) {
        // Follow scrubbed store time while paused
        localTimeRef.current = timeMsRef.current;
      }

      const p: Pattern | null = patternRef.current;
      const els = [frontRef.current, midRef.current, backRef.current];
      if (p) {
        applyColors(els, samplePattern(p, localTimeRef.current));
      } else {
        applyColors(els, [
          { r: 0, g: 0, b: 0, a: 0 },
          { r: 0, g: 0, b: 0, a: 0 },
          { r: 0, g: 0, b: 0, a: 0 },
        ]);
      }

      // Publish time to React occasionally for transport UI (~8 Hz)
      if (playingRef.current && wall - lastPublish > 120) {
        lastPublish = wall;
        setTimeMs(localTimeRef.current);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setTimeMs, patternRef, playingRef, speedRef, timeMsRef]);

  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        <svg className={styles.chassis} viewBox="0 0 320 140" aria-hidden>
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a303c" />
              <stop offset="100%" stopColor="#141820" />
            </linearGradient>
          </defs>
          <rect
            x="40"
            y="28"
            width="240"
            height="72"
            rx="18"
            fill="url(#bodyGrad)"
            stroke="#3a4458"
            strokeWidth="2"
          />
          <rect
            x="70"
            y="48"
            width="180"
            height="22"
            rx="8"
            fill="#0c1018"
            stroke="#2a3448"
            strokeWidth="1"
          />
          <ellipse
            cx="160"
            cy="110"
            rx="90"
            ry="10"
            fill="#0a0c10"
            opacity="0.55"
          />
        </svg>

        <div
          className={styles.ledBar}
          role="img"
          aria-label="Backpack LEDs Front Middle Back"
        >
          <div className={styles.ledSlot}>
            <div ref={frontRef} className={styles.led} data-led="front" />
            <span className={styles.ledLabel}>Front</span>
          </div>
          <div className={styles.ledSlot}>
            <div ref={midRef} className={styles.led} data-led="middle" />
            <span className={styles.ledLabel}>Middle</span>
          </div>
          <div className={styles.ledSlot}>
            <div ref={backRef} className={styles.led} data-led="back" />
            <span className={styles.ledLabel}>Back</span>
          </div>
        </div>

        <div
          className={styles.systemLed}
          title="System / pairing LED — not driven by pack JSON"
        >
          <div className={styles.systemDot} />
          <span>System · not in pack</span>
        </div>
      </div>
    </div>
  );
}
