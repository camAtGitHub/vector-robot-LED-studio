import { BackpackMockup } from './BackpackMockup';
import { Transport } from './Transport';
import { Waveform } from './Waveform';
import { usePackStore } from '../store/packStore';
import styles from './PreviewPanel.module.css';

export function PreviewPanel() {
  const { selectedMode, state } = usePackStore();

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Vector backpack mock-up</h2>
        {selectedMode && (
          <span className={styles.mode}>
            {selectedMode.label}
            <span className={styles.clad}> · {selectedMode.cladEvent}</span>
          </span>
        )}
        {!state.pack && (
          <span className={styles.hint}>Load stock or example to preview</span>
        )}
      </div>
      <BackpackMockup />
      <div className={styles.controls}>
        <Transport />
        <Waveform />
      </div>
    </section>
  );
}
