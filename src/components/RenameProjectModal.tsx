import { useEffect, useState } from 'react';
import { usePackStore } from '../store/packStore';
import styles from './RenameProjectModal.module.css';

export function RenameProjectModal() {
  const { state, dispatch } = usePackStore();
  const pack = state.pack;
  const [name, setName] = useState('');

  useEffect(() => {
    if (state.renameOpen && pack) {
      setName(pack.name);
    }
  }, [state.renameOpen, pack]);

  if (!pack || !state.renameOpen) return null;

  const close = () => dispatch({ type: 'SET_RENAME', open: false });

  const confirm = () => {
    const next = name.trim();
    if (!next) return;
    dispatch({ type: 'SET_PACK_NAME', name: next });
    dispatch({ type: 'SET_RENAME', open: false });
    dispatch({
      type: 'SET_STATUS',
      status: `Renamed project to “${next}”`,
    });
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-title"
      onClick={close}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.head}>
          <h2 id="rename-title">Rename project</h2>
          <button
            type="button"
            className={styles.close}
            onClick={close}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <form
          className={styles.body}
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            aria-label="Project name"
          />
          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={close}>
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary}>
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
