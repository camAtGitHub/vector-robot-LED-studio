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
          <h2 id="about-title">About · Backpack Lights Designer</h2>
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
            Offline designer for Vector’s <strong>3 backpack LEDs</strong>{' '}
            (Front / Middle / Back). Preview uses the same segment math as the
            robot firmware (<code>GetCurrentLEDcolor</code>).
          </p>

          <h3>Upload to robot</h3>
          <ol>
            <li>
              Export a <strong>robot zip</strong> (not the .bpld.json project).
            </li>
            <li>
              Unpack so files land at{' '}
              <code>/data/data/customBackpackLights/</code> on the robot
              (contents of the pack, not a nested folder name twice).
            </li>
            <li>
              Both sentinels must exist:{' '}
              <code>off.json</code> and{' '}
              <code>cubeSpinner/purple/spinner_purple_celebration.json</code>.
            </li>
            <li>
              Restart the robot processes so the custom path is re-read
              (hot-reload is not reliable).
            </li>
          </ol>

          <h3>Honesty notes</h3>
          <ul>
            <li>
              Preview colors equal <code>samplePattern</code> output — not
              independent CSS animations.
            </li>
            <li>
              Real LED gamut / diffuser may look slightly different on hardware.
            </li>
            <li>
              The 4th <strong>system / pairing</strong> light is decorative in
              the mock-up and is <em>not</em> part of pack JSON.
            </li>
            <li>
              Only 3 LEDs are edited. Cube lights use a different format.
            </li>
            <li>
              Some firmware builds may shadow the custom pack path — if lights
              don’t change after upload, check robot loader notes separately.
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
