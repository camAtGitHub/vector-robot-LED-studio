import { hasSentinels } from '../io';
import { usePackStore } from '../store/packStore';
import styles from './ValidationBar.module.css';

export function ValidationBar() {
  const { state } = usePackStore();
  const { pack, report, status, busy } = state;

  if (!pack || !report) {
    return (
      <footer className={styles.bar}>
        <span className={styles.muted}>
          {busy ? 'Working…' : status || 'No pack loaded'}
        </span>
      </footer>
    );
  }

  const errors = report.issues.filter((i) => i.severity === 'error');
  const warnings = report.issues.filter((i) => i.severity === 'warning');
  const sentinels = hasSentinels(pack);
  const ready = report.ok && sentinels && report.patternCount >= 32;

  return (
    <footer className={styles.bar}>
      <div className={styles.main}>
        <span
          className={`${styles.badge} ${
            ready ? styles.ok : errors.length ? styles.err : styles.warn
          }`}
        >
          {ready ? 'ready' : errors.length ? 'blocked' : 'partial'}
        </span>
        <span>
          Validation: {report.patternCount}/{report.expectedCount} ok
          {sentinels ? ' · sentinels present' : ' · sentinels missing'}
          {errors.length ? ` · ${errors.length} error(s)` : ''}
          {warnings.length ? ` · ${warnings.length} warning(s)` : ''}
          {ready ? ' · ready to export' : ''}
        </span>
        {pack.dirty && <span className={styles.dirty}>unsaved edits</span>}
      </div>
      <div className={styles.status} title={status}>
        {busy ? 'Working…' : status}
      </div>
      {(errors.length > 0 || warnings.length > 0) && (
        <details className={styles.details}>
          <summary>Issues</summary>
          <ul>
            {report.issues.slice(0, 20).map((issue, i) => (
              <li
                key={`${issue.code}-${issue.path ?? ''}-${i}`}
                className={
                  issue.severity === 'error' ? styles.errText : styles.warnText
                }
              >
                [{issue.severity}] {issue.message}
              </li>
            ))}
            {report.issues.length > 20 && (
              <li className={styles.muted}>
                …and {report.issues.length - 20} more
              </li>
            )}
          </ul>
        </details>
      )}
    </footer>
  );
}
