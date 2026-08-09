/**
 * App document store — pack + selection + transport + undo + favorites.
 * React context (no Zustand dependency).
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type { ModeDef, Pack, Pattern } from '../domain';
import {
  clonePattern,
  getAllModes,
  loadFavorites,
  addFavorite as addFavoriteLib,
  removeFavorite as removeFavoriteLib,
  type Favorite,
} from '../domain';
import {
  type ImportResult,
  type PackValidationReport,
  validatePack,
} from '../io';

const UNDO_LIMIT = 40;

export interface PackState {
  pack: Pack | null;
  report: PackValidationReport | null;
  selectedCladEvent: string;
  linkLeds: boolean;
  playing: boolean;
  speed: number;
  /** Preview clock in ms (advanced by rAF; also set by scrub). */
  timeMs: number;
  undoStack: Pattern[];
  redoStack: Pattern[];
  patternClipboard: Pattern | null;
  favorites: Favorite[];
  busy: boolean;
  status: string;
  aboutOpen: boolean;
  editorTab: 'fields' | 'json' | 'favorites';
}

type Action =
  | { type: 'SET_BUSY'; busy: boolean }
  | { type: 'SET_STATUS'; status: string }
  | { type: 'SET_ABOUT'; open: boolean }
  | { type: 'SET_EDITOR_TAB'; tab: PackState['editorTab'] }
  | { type: 'APPLY_IMPORT'; result: ImportResult; status: string }
  | { type: 'SET_PACK'; pack: Pack; report?: PackValidationReport | null }
  | { type: 'SELECT_MODE'; cladEvent: string }
  | { type: 'SET_LINK_LEDS'; link: boolean }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'SET_TIME'; timeMs: number }
  | { type: 'UPDATE_PATTERN'; pattern: Pattern; pushUndo?: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'COPY_PATTERN' }
  | { type: 'PASTE_PATTERN' }
  | { type: 'SET_CLIPBOARD'; pattern: Pattern | null }
  | { type: 'SET_FAVORITES'; favorites: Favorite[] }
  | { type: 'CLEAR_UNDO' };

function selectedMode(state: PackState): ModeDef | undefined {
  return getAllModes().find((m) => m.cladEvent === state.selectedCladEvent);
}

function currentPattern(state: PackState): Pattern | null {
  if (!state.pack) return null;
  const mode = selectedMode(state);
  if (!mode) return null;
  return state.pack.patterns[mode.relativePath] ?? null;
}

function revalidate(pack: Pack): PackValidationReport {
  return validatePack(pack);
}

function initialState(): PackState {
  return {
    pack: null,
    report: null,
    selectedCladEvent: 'Charging',
    linkLeds: false,
    playing: true,
    speed: 1,
    timeMs: 0,
    undoStack: [],
    redoStack: [],
    patternClipboard: null,
    favorites: loadFavorites(),
    busy: false,
    status: 'Load a pack to begin',
    aboutOpen: false,
    editorTab: 'fields',
  };
}

function reducer(state: PackState, action: Action): PackState {
  switch (action.type) {
    case 'SET_BUSY':
      return { ...state, busy: action.busy };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_ABOUT':
      return { ...state, aboutOpen: action.open };
    case 'SET_EDITOR_TAB':
      return { ...state, editorTab: action.tab };
    case 'APPLY_IMPORT': {
      const pack = action.result.pack;
      const modes = getAllModes();
      let selected = state.selectedCladEvent;
      const hasSelected = modes.some(
        (m) =>
          m.cladEvent === selected && m.relativePath in pack.patterns
      );
      if (!hasSelected) {
        const first = modes.find((m) => m.relativePath in pack.patterns);
        selected = first?.cladEvent ?? 'Charging';
      }
      return {
        ...state,
        pack,
        report: action.result.report,
        selectedCladEvent: selected,
        status: action.status,
        undoStack: [],
        redoStack: [],
        timeMs: 0,
      };
    }
    case 'SET_PACK': {
      const report = action.report ?? revalidate(action.pack);
      return { ...state, pack: action.pack, report };
    }
    case 'SELECT_MODE':
      return {
        ...state,
        selectedCladEvent: action.cladEvent,
        undoStack: [],
        redoStack: [],
        timeMs: 0,
      };
    case 'SET_LINK_LEDS':
      return { ...state, linkLeds: action.link };
    case 'SET_PLAYING':
      return { ...state, playing: action.playing };
    case 'SET_SPEED':
      return {
        ...state,
        speed: Math.min(2, Math.max(0.25, action.speed)),
      };
    case 'SET_TIME':
      return { ...state, timeMs: Math.max(0, action.timeMs) };
    case 'UPDATE_PATTERN': {
      if (!state.pack) return state;
      const mode = selectedMode(state);
      if (!mode) return state;
      const prev = state.pack.patterns[mode.relativePath];
      let undoStack = state.undoStack;
      let redoStack = state.redoStack;
      if (action.pushUndo !== false && prev) {
        undoStack = [...state.undoStack, clonePattern(prev)].slice(
          -UNDO_LIMIT
        );
        redoStack = [];
      }
      const pack: Pack = {
        ...state.pack,
        dirty: true,
        patterns: {
          ...state.pack.patterns,
          [mode.relativePath]: clonePattern(action.pattern),
        },
      };
      return {
        ...state,
        pack,
        report: revalidate(pack),
        undoStack,
        redoStack,
      };
    }
    case 'UNDO': {
      if (!state.pack || state.undoStack.length === 0) return state;
      const mode = selectedMode(state);
      if (!mode) return state;
      const current = state.pack.patterns[mode.relativePath];
      if (!current) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      const undoStack = state.undoStack.slice(0, -1);
      const redoStack = [...state.redoStack, clonePattern(current)].slice(
        -UNDO_LIMIT
      );
      const pack: Pack = {
        ...state.pack,
        dirty: true,
        patterns: {
          ...state.pack.patterns,
          [mode.relativePath]: clonePattern(prev),
        },
      };
      return {
        ...state,
        pack,
        report: revalidate(pack),
        undoStack,
        redoStack,
      };
    }
    case 'REDO': {
      if (!state.pack || state.redoStack.length === 0) return state;
      const mode = selectedMode(state);
      if (!mode) return state;
      const current = state.pack.patterns[mode.relativePath];
      if (!current) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      const redoStack = state.redoStack.slice(0, -1);
      const undoStack = [...state.undoStack, clonePattern(current)].slice(
        -UNDO_LIMIT
      );
      const pack: Pack = {
        ...state.pack,
        dirty: true,
        patterns: {
          ...state.pack.patterns,
          [mode.relativePath]: clonePattern(next),
        },
      };
      return {
        ...state,
        pack,
        report: revalidate(pack),
        undoStack,
        redoStack,
      };
    }
    case 'COPY_PATTERN': {
      const p = currentPattern(state);
      if (!p) return state;
      return { ...state, patternClipboard: clonePattern(p), status: 'Pattern copied' };
    }
    case 'PASTE_PATTERN': {
      if (!state.patternClipboard || !state.pack) return state;
      const mode = selectedMode(state);
      if (!mode) return state;
      const prev = state.pack.patterns[mode.relativePath];
      const undoStack = prev
        ? [...state.undoStack, clonePattern(prev)].slice(-UNDO_LIMIT)
        : state.undoStack;
      const pack: Pack = {
        ...state.pack,
        dirty: true,
        patterns: {
          ...state.pack.patterns,
          [mode.relativePath]: clonePattern(state.patternClipboard),
        },
      };
      return {
        ...state,
        pack,
        report: revalidate(pack),
        undoStack,
        redoStack: [],
        status: `Pasted to ${mode.label}`,
      };
    }
    case 'SET_CLIPBOARD':
      return { ...state, patternClipboard: action.pattern };
    case 'SET_FAVORITES':
      return { ...state, favorites: action.favorites };
    case 'CLEAR_UNDO':
      return { ...state, undoStack: [], redoStack: [] };
    default:
      return state;
  }
}

export interface PackStoreApi {
  state: PackState;
  selectedMode: ModeDef | undefined;
  pattern: Pattern | null;
  dispatch: React.Dispatch<Action>;
  applyImport: (result: ImportResult, label: string) => void;
  updatePattern: (pattern: Pattern, pushUndo?: boolean) => void;
  selectMode: (cladEvent: string) => void;
  setTimeMs: (t: number) => void;
  /** Mutate time without re-render (for rAF); returns ref. */
  timeMsRef: React.MutableRefObject<number>;
  playingRef: React.MutableRefObject<boolean>;
  speedRef: React.MutableRefObject<number>;
  patternRef: React.MutableRefObject<Pattern | null>;
  starFavorite: (name?: string) => void;
  removeFavorite: (id: string) => void;
  applyFavorite: (id: string) => void;
  runBusy: (fn: () => Promise<void>) => Promise<void>;
}

const PackStoreContext = createContext<PackStoreApi | null>(null);

export function PackStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const timeMsRef = useRef(0);
  const playingRef = useRef(true);
  const speedRef = useRef(1);
  const patternRef = useRef<Pattern | null>(null);

  // Keep refs in sync for rAF consumers
  timeMsRef.current = state.timeMs;
  playingRef.current = state.playing;
  speedRef.current = state.speed;

  const mode = useMemo(
    () => getAllModes().find((m) => m.cladEvent === state.selectedCladEvent),
    [state.selectedCladEvent]
  );

  const pattern = useMemo(() => {
    if (!state.pack || !mode) return null;
    return state.pack.patterns[mode.relativePath] ?? null;
  }, [state.pack, mode]);

  patternRef.current = pattern;

  const applyImport = useCallback((result: ImportResult, label: string) => {
    const errCount = result.report.issues.filter(
      (i) => i.severity === 'error'
    ).length;
    const warnCount = result.report.issues.filter(
      (i) => i.severity === 'warning'
    ).length;
    const status =
      `${label}: ${result.report.patternCount}/${result.report.expectedCount} patterns` +
      (errCount ? ` · ${errCount} error(s)` : '') +
      (warnCount ? ` · ${warnCount} warning(s)` : '');
    dispatch({ type: 'APPLY_IMPORT', result, status });
  }, []);

  const updatePattern = useCallback(
    (next: Pattern, pushUndo = true) => {
      dispatch({ type: 'UPDATE_PATTERN', pattern: next, pushUndo });
    },
    []
  );

  const selectMode = useCallback((cladEvent: string) => {
    dispatch({ type: 'SELECT_MODE', cladEvent });
  }, []);

  const setTimeMs = useCallback((t: number) => {
    timeMsRef.current = t;
    dispatch({ type: 'SET_TIME', timeMs: t });
  }, []);

  const starFavorite = useCallback(
    (name?: string) => {
      const p = patternRef.current;
      if (!p) return;
      const label =
        name ??
        mode?.label ??
        state.selectedCladEvent;
      const favorites = addFavoriteLib(state.favorites, label, p);
      dispatch({ type: 'SET_FAVORITES', favorites });
      dispatch({ type: 'SET_STATUS', status: `★ Saved “${label}”` });
    },
    [mode, state.favorites, state.selectedCladEvent]
  );

  const removeFavorite = useCallback(
    (id: string) => {
      const favorites = removeFavoriteLib(state.favorites, id);
      dispatch({ type: 'SET_FAVORITES', favorites });
    },
    [state.favorites]
  );

  const applyFavorite = useCallback(
    (id: string) => {
      const fav = state.favorites.find((f) => f.id === id);
      if (!fav) return;
      dispatch({ type: 'UPDATE_PATTERN', pattern: fav.pattern, pushUndo: true });
      dispatch({
        type: 'SET_STATUS',
        status: `Applied favorite “${fav.name}”`,
      });
    },
    [state.favorites]
  );

  const runBusy = useCallback(async (fn: () => Promise<void>) => {
    dispatch({ type: 'SET_BUSY', busy: true });
    try {
      await fn();
    } catch (e) {
      dispatch({
        type: 'SET_STATUS',
        status: e instanceof Error ? e.message : String(e),
      });
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false });
    }
  }, []);

  const api = useMemo<PackStoreApi>(
    () => ({
      state,
      selectedMode: mode,
      pattern,
      dispatch,
      applyImport,
      updatePattern,
      selectMode,
      setTimeMs,
      timeMsRef,
      playingRef,
      speedRef,
      patternRef,
      starFavorite,
      removeFavorite,
      applyFavorite,
      runBusy,
    }),
    [
      state,
      mode,
      pattern,
      applyImport,
      updatePattern,
      selectMode,
      setTimeMs,
      starFavorite,
      removeFavorite,
      applyFavorite,
      runBusy,
    ]
  );

  return (
    <PackStoreContext.Provider value={api}>{children}</PackStoreContext.Provider>
  );
}

export function usePackStore(): PackStoreApi {
  const ctx = useContext(PackStoreContext);
  if (!ctx) {
    throw new Error('usePackStore must be used within PackStoreProvider');
  }
  return ctx;
}
