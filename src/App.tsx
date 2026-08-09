import { useEffect } from 'react';
import { Header } from './components/Header';
import { ModeList } from './components/ModeList';
import { PreviewPanel } from './components/PreviewPanel';
import { PatternEditor } from './components/PatternEditor';
import { ValidationBar } from './components/ValidationBar';
import { AboutModal } from './components/AboutModal';
import { PackStoreProvider, usePackStore } from './store/packStore';
import { downloadProject } from './domain';
import { newPackFromStock } from './io';
import './App.css';

function KeyboardShortcuts() {
  const { state, dispatch, pattern } = usePackStore();

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
            type: 'SET_STATUS',
            status: 'Project saved (download)',
          });
        }
        return;
      }

      // Silence unused when no pattern
      void pattern;
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, state.playing, state.pack, pattern]);

  return null;
}

function BootstrapPack() {
  const { state, applyImport, runBusy } = usePackStore();

  useEffect(() => {
    if (state.pack) return;
    void runBusy(async () => {
      applyImport(await newPackFromStock('My pack'), 'New from stock');
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
