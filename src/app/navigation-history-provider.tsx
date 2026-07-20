import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import {
  applyNavHistoryTransition,
  canGoBack as historyCanGoBack,
  canGoForward as historyCanGoForward,
  createInitialNavHistory,
  isSameNavEntry,
  subscribeNavigationHistoryReset,
  type NavHistoryEntry,
  type NavHistoryState,
} from "@/lib/navigationHistory";

interface ScrollSnapshot {
  windowX: number;
  windowY: number;
  appContentTop: number;
}

interface NavigationHistoryContextValue {
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  locationKey: string;
  navigationType: "PUSH" | "REPLACE" | "POP";
  getViewState: <T>(slotKey: string) => T | undefined;
  setViewState: <T>(slotKey: string, value: T) => void;
  getViewStateAt: <T>(locationKey: string, slotKey: string) => T | undefined;
  setViewStateAt: <T>(locationKey: string, slotKey: string, value: T) => void;
  clearViewStateSlot: (slotKey: string) => void;
}

const NavigationHistoryContext = createContext<NavigationHistoryContextValue | null>(null);

const viewStateByLocationKey = new Map<string, Map<string, unknown>>();
const scrollByLocationKey = new Map<string, ScrollSnapshot>();

function migrateLocationStores(fromKey: string, toKey: string) {
  if (!fromKey || !toKey || fromKey === toKey) return;
  const view = viewStateByLocationKey.get(fromKey);
  if (view) {
    viewStateByLocationKey.set(toKey, view);
    viewStateByLocationKey.delete(fromKey);
  }
  const scroll = scrollByLocationKey.get(fromKey);
  if (scroll) {
    scrollByLocationKey.set(toKey, scroll);
    scrollByLocationKey.delete(fromKey);
  }
}

function readAppContentScroll(): number {
  const el = document.querySelector(".app-content");
  return el instanceof HTMLElement ? el.scrollTop : 0;
}

function writeAppContentScroll(top: number) {
  const el = document.querySelector(".app-content");
  if (el instanceof HTMLElement) el.scrollTop = top;
}

function captureScroll(): ScrollSnapshot {
  return {
    windowX: window.scrollX,
    windowY: window.scrollY,
    appContentTop: readAppContentScroll(),
  };
}

function restoreScroll(snapshot: ScrollSnapshot | undefined) {
  if (!snapshot) return;
  writeAppContentScroll(snapshot.appContentTop);
  window.scrollTo(snapshot.windowX, snapshot.windowY);
}

function clearNavigationStores() {
  viewStateByLocationKey.clear();
  scrollByLocationKey.clear();
}

function toEntry(location: { key: string; pathname: string; search: string }): NavHistoryEntry {
  return {
    key: location.key,
    pathname: location.pathname,
    search: location.search,
  };
}

export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [historyState, setHistoryState] = useState<NavHistoryState>(() =>
    createInitialNavHistory(toEntry(location)),
  );
  const prevLocationRef = useRef(toEntry(location));
  const locationRef = useRef(location);
  locationRef.current = location;
  const skipScrollRestoreRef = useRef(false);

  useEffect(() => {
    return subscribeNavigationHistoryReset(() => {
      const loc = locationRef.current;
      clearNavigationStores();
      setHistoryState(createInitialNavHistory(toEntry(loc)));
      prevLocationRef.current = toEntry(loc);
      skipScrollRestoreRef.current = true;
    });
  }, []);

  useEffect(() => {
    const entry = toEntry(location);
    const prev = prevLocationRef.current;
    if (prev.key && prev.key !== location.key) {
      scrollByLocationKey.set(prev.key, captureScroll());
      // REPLACE may mint a new key for the same URL; keep view/scroll snapshots attached.
      if (navigationType === "REPLACE" && isSameNavEntry(prev, entry)) {
        migrateLocationStores(prev.key, location.key);
      }
    }
    prevLocationRef.current = entry;

    setHistoryState((current) => applyNavHistoryTransition(current, entry, navigationType));
  }, [location.key, location.pathname, location.search, navigationType]);

  useLayoutEffect(() => {
    if (skipScrollRestoreRef.current) {
      skipScrollRestoreRef.current = false;
      return;
    }
    if (navigationType !== "POP") {
      if (navigationType === "PUSH") {
        writeAppContentScroll(0);
        window.scrollTo(0, 0);
      }
      return;
    }
    const snapshot = scrollByLocationKey.get(location.key);
    const frame = window.requestAnimationFrame(() => restoreScroll(snapshot));
    return () => window.cancelAnimationFrame(frame);
  }, [location.key, navigationType]);

  const getViewStateAt = useCallback(<T,>(atKey: string, slotKey: string): T | undefined => {
    const bucket = viewStateByLocationKey.get(atKey);
    if (!bucket || !bucket.has(slotKey)) return undefined;
    return bucket.get(slotKey) as T;
  }, []);

  const setViewStateAt = useCallback(<T,>(atKey: string, slotKey: string, value: T) => {
    if (!atKey) return;
    let bucket = viewStateByLocationKey.get(atKey);
    if (!bucket) {
      bucket = new Map();
      viewStateByLocationKey.set(atKey, bucket);
    }
    bucket.set(slotKey, value);
  }, []);

  const getViewState = useCallback(<T,>(slotKey: string): T | undefined => {
    return getViewStateAt<T>(location.key, slotKey);
  }, [getViewStateAt, location.key]);

  const setViewState = useCallback(<T,>(slotKey: string, value: T) => {
    setViewStateAt(location.key, slotKey, value);
  }, [location.key, setViewStateAt]);

  const clearViewStateSlot = useCallback((slotKey: string) => {
    viewStateByLocationKey.get(location.key)?.delete(slotKey);
  }, [location.key]);

  const goBack = useCallback(() => {
    if (!historyCanGoBack(historyState)) return;
    navigate(-1);
  }, [historyState, navigate]);

  const goForward = useCallback(() => {
    if (!historyCanGoForward(historyState)) return;
    navigate(1);
  }, [historyState, navigate]);

  const value = useMemo<NavigationHistoryContextValue>(
    () => ({
      canGoBack: historyCanGoBack(historyState),
      canGoForward: historyCanGoForward(historyState),
      goBack,
      goForward,
      locationKey: location.key,
      navigationType,
      getViewState,
      setViewState,
      getViewStateAt,
      setViewStateAt,
      clearViewStateSlot,
    }),
    [
      historyState,
      goBack,
      goForward,
      location.key,
      navigationType,
      getViewState,
      setViewState,
      getViewStateAt,
      setViewStateAt,
      clearViewStateSlot,
    ],
  );

  return (
    <NavigationHistoryContext.Provider value={value}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

export function useNavigationHistory(): NavigationHistoryContextValue {
  const ctx = useContext(NavigationHistoryContext);
  if (!ctx) {
    throw new Error("useNavigationHistory must be used within NavigationHistoryProvider");
  }
  return ctx;
}

/** Optional access when chrome may render outside the provider (should not happen in app shell). */
export function useNavigationHistoryOptional(): NavigationHistoryContextValue | null {
  return useContext(NavigationHistoryContext);
}
