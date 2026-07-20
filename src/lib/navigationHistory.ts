export interface NavHistoryEntry {
  key: string;
  pathname: string;
  search: string;
}

export interface NavHistoryState {
  entries: NavHistoryEntry[];
  index: number;
}

export const NAV_HISTORY_MAX_ENTRIES = 50;

export function locationIdentity(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export function isSameNavEntry(
  a: Pick<NavHistoryEntry, "pathname" | "search"> | null | undefined,
  b: Pick<NavHistoryEntry, "pathname" | "search"> | null | undefined,
): boolean {
  if (!a || !b) return false;
  return locationIdentity(a.pathname, a.search) === locationIdentity(b.pathname, b.search);
}

export function createInitialNavHistory(entry: NavHistoryEntry): NavHistoryState {
  return { entries: [entry], index: 0 };
}

export function applyNavHistoryTransition(
  state: NavHistoryState,
  next: NavHistoryEntry,
  navigationType: "PUSH" | "REPLACE" | "POP",
): NavHistoryState {
  if (navigationType === "POP") {
    const matchIndex = state.entries.findIndex((entry) => entry.key === next.key);
    if (matchIndex >= 0) {
      return { ...state, index: matchIndex };
    }
    // Fallback: match by path when key is missing/recreated.
    const byPath = state.entries.findIndex((entry) => isSameNavEntry(entry, next));
    if (byPath >= 0) {
      const entries = state.entries.slice();
      entries[byPath] = next;
      return { entries, index: byPath };
    }
    return state;
  }

  if (navigationType === "REPLACE") {
    // replaceState updates the current entry only; keep forward entries intact.
    const entries = state.entries.slice();
    const current = entries[state.index];
    if (current && isSameNavEntry(current, next) && current.key === next.key) {
      return state;
    }
    entries[state.index] = next;
    return { entries, index: state.index };
  }

  // PUSH
  const current = state.entries[state.index];
  if (current && current.key === next.key && isSameNavEntry(current, next)) {
    return state;
  }
  // Same URL with a new key (e.g. overlay history) still advances the stack.

  const truncated = state.entries.slice(0, state.index + 1);
  truncated.push(next);
  const overflow = Math.max(0, truncated.length - NAV_HISTORY_MAX_ENTRIES);
  const entries = overflow > 0 ? truncated.slice(overflow) : truncated;
  return { entries, index: entries.length - 1 };
}

export function canGoBack(state: NavHistoryState): boolean {
  return state.index > 0;
}

export function canGoForward(state: NavHistoryState): boolean {
  return state.index >= 0 && state.index < state.entries.length - 1;
}

/** Module-level reset hook for session clear (provider subscribes). */
type ResetListener = () => void;
const resetListeners = new Set<ResetListener>();

export function subscribeNavigationHistoryReset(listener: ResetListener): () => void {
  resetListeners.add(listener);
  return () => {
    resetListeners.delete(listener);
  };
}

export function resetNavigationHistoryForSessionClear(): void {
  resetListeners.forEach((listener) => listener());
}
