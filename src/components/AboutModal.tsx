import { usePackStore } from '../store/packStore';
import styles from './AboutModal.module.css';

export function AboutModal() {
  const { state, dispatch } = usePackStore();
  if (!state.aboutOpen) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      onClick={() => dispatch({ type: 'SET_ABOUT', open: false })}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 id="about-title">About · Vector Robot LED Backpack Studio</h2>
          <button
            type="button"
            className={styles.close}
            onClick={() => dispatch({ type: 'SET_ABOUT', open: false })}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className={styles.body}>
          <p>
            Offline Studio for Vector’s <strong>3 backpack LEDs</strong> (Front
            / Middle / Back).
          </p>
          <p>
            Based on firmware <code>GetCurrentLEDcolor</code> function.
          </p>

          <h3>Upload to robot</h3>
          <ol>
            <li>
              Export a robot zip (not the .bpld.json project) and unzip the
              files locally.
            </li>
            <li>
              SCP files to <code>/data/data/customBackpackLights/</code>.
            </li>
            <li>
              Ensure that json files land at{' '}
              <code>/data/data/customBackpackLights/*.json</code> and{' '}
              <code>
                /data/data/customBackpackLights/cubeSpinner/red/*.json
              </code>{' '}
              etc.
            </li>
            <li>
              Required files (sentinels) must exist: <code>off.json</code> and{' '}
              <code>cubeSpinner/purple/spinner_purple_celebration.json</code>.
            </li>
            <li>Reboot Vector.</li>
          </ol>

          <h3>Other</h3>
          <ul>
            <li>
              Real LED diffusion may look slightly different on Vector.
            </li>
            <li>
              The 4th system / pairing light is decorative in the mock-up and
              is not configurable via Backpack Studio.
            </li>
            <li>
              Only 3 LEDs are edited. Cube lights use a different format.
            </li>
            <li>
              Not all Vector firmwares support custom backpack lights being
              loaded.
            </li>
          </ul>

          <h3>Shortcuts</h3>
          <ul>
            <li>
              <kbd>Space</kbd> play / pause
            </li>
            <li>
              <kbd>←</kbd> / <kbd>→</kbd> scrub timeline (Shift = 100&nbsp;ms
              steps)
            </li>
            <li>
              <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> undo /
              redo pattern edits
            </li>
            <li>
              <kbd>Ctrl</kbd>+<kbd>S</kbd> download project file
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
