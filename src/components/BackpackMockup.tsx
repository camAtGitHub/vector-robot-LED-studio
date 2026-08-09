import { useEffect, useRef } from 'react';
import { samplePattern, type Pattern, type Rgba8 } from '../domain';
import { usePackStore } from '../store/packStore';
import robotLeds from '../assets/robot-LEDS.png';
import styles from './BackpackMockup.module.css';

function cssRgb(c: Rgba8): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

/** Peak channel 0–1 — even glow across hues (yellow vs pink), unlike luminance. */
function peak(c: Rgba8): number {
  return Math.max(c.r, c.g, c.b) / 255;
}

function applyColors(
  els: Array<HTMLDivElement | null>,
  colors: [Rgba8, Rgba8, Rgba8]
): void {
  for (let i = 0; i < 3; i++) {
    const el = els[i];
    if (!el) continue;
    const c = colors[i];
    const p = peak(c);
    const on = p > 0.02;

    // Always opaque so the white photo LEDs never bleed through and wash colors.
    el.style.opacity = '1';
    el.style.backgroundImage = 'none';

    if (!on) {
      el.style.backgroundColor = '#05070c';
      el.style.boxShadow = 'none';
      continue;
    }

    const color = cssRgb(c);
    // Cap glow so high-luminance hues (yellow) don't balloon past saturated ones.
    const blur = 5 + p * 12;
    const spread = 1 + p * 3;
    // Tiny same-hue highlight — not pure white, which desaturates pinks/reds.
    const hi = `rgba(${Math.min(255, Math.round(c.r * 0.35 + 165))}, ${Math.min(255, Math.round(c.g * 0.35 + 165))}, ${Math.min(255, Math.round(c.b * 0.35 + 165))}, 0.28)`;

    el.style.backgroundColor = color;
    el.style.boxShadow = `0 0 ${blur}px ${spread}px ${color},
       0 0 ${blur * 0.45}px 0 ${color},
       inset 0 0 3px ${hi}`;
  }
}

/**
 * 3-LED backpack mock-up over the real backpack photo.
 * Visual order left→right is Back · Middle · Front.
 * Colors come only from samplePattern (player math).
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
        <img
          className={styles.chassis}
          src={robotLeds}
          alt="Vector backpack"
          draggable={false}
        />

        {/*
          LED bounds measured on robot-LEDS.png (2048×1454):
          Back   x 347–444  y 682–747
          Middle x 461–558  y 682–747
          Front  x 575–672  y 682–747
          Left = back, right = front (as on the robot).
        */}
        <div
          className={styles.ledLayer}
          role="img"
          aria-label="Backpack LEDs Back Middle Front"
        >
          <div
            ref={backRef}
            className={`${styles.led} ${styles.ledBack}`}
            data-led="back"
          />
          <div
            ref={midRef}
            className={`${styles.led} ${styles.ledMiddle}`}
            data-led="middle"
          />
          <div
            ref={frontRef}
            className={`${styles.led} ${styles.ledFront}`}
            data-led="front"
          />
        </div>
      </div>
    </div>
  );
}
