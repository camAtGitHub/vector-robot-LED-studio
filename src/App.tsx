import { useEffect } from 'react';
import { Header } from './components/Header';
import { ModeList } from './components/ModeList';
import { PreviewPanel } from './components/PreviewPanel';
import { PatternEditor } from './components/PatternEditor';
import { ValidationBar } from './components/ValidationBar';
import { AboutModal } from './components/AboutModal';
import { RenameProjectModal } from './components/RenameProjectModal';
import { PackStoreProvider, usePackStore } from './store/packStore';
import { downloadProject } from './domain';
import { loadBundledPack } from './io';
import './App.css';

function KeyboardShortcuts() {
  const { state, dispatch, pattern, setTimeMs, timeMsRef } = usePackStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable;

      if (e.code === 'Space' && !editable) {
        e.preventDefault();
        dispatch({ type: 'SET_PLAYING', playing: !state.playing });
        return;
      }

      // Arrow Left/Right scrub timeline when not in a form field
      if (
        !editable &&
        (e.code === 'ArrowLeft' || e.code === 'ArrowRight') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 100 : 16; // ~1 frame or coarser
        const delta = e.code === 'ArrowLeft' ? -step : step;
        const next = Math.max(0, timeMsRef.current + delta);
        timeMsRef.current = next;
        setTimeMs(next);
        if (state.playing) {
          dispatch({ type: 'SET_PLAYING', playing: false });
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (!editable) {
          e.preventDefault();
          dispatch({ type: 'UNDO' });
        }
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        if (!editable) {
          e.preventDefault();
          dispatch({ type: 'REDO' });
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (state.pack) {
          downloadProject(state.pack);
          dispatch({
            type: 'MARK_CLEAN',
            status: 'Project saved (download)',
          });
        }
        return;
      }

      void pattern;
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    dispatch,
    state.playing,
    state.pack,
    pattern,
    setTimeMs,
    timeMsRef,
  ]);

  return null;
}

function BootstrapPack() {
  const { state, applyImport, runBusy } = usePackStore();

  useEffect(() => {
    if (state.pack) return;
    void runBusy(async () => {
      applyImport(await loadBundledPack('stock'), 'Stock Anki');
    });
    // once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function Shell() {
  return (
    <div className="app">
      <KeyboardShortcuts />
      <BootstrapPack />
      <Header />
      <div className="app-body">
        <ModeList />
        <PreviewPanel />
        <PatternEditor />
      </div>
      <ValidationBar />
      <AboutModal />
      <RenameProjectModal />
    </div>
  );
}

export default function App() {
  return (
    <PackStoreProvider>
      <Shell />
    </PackStoreProvider>
  );
}
