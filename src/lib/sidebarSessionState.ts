export type SidebarState = "expanded" | "collapsed";

const STORAGE_KEY = "pt.sidebar.state";
export const SIDEBAR_STATE_RESET_EVENT = "pt:sidebar-state-reset";

/** Survives AppShell remounts on route change (each page owns its own AppShell). */
let sidebarStateMemory: SidebarState | null = null;

export function readSidebarState(): SidebarState {
  if (sidebarStateMemory === "expanded" || sidebarStateMemory === "collapsed") {
    return sidebarStateMemory;
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "expanded" || stored === "collapsed") {
      sidebarStateMemory = stored;
      return stored;
    }
  } catch {
    /* ignore quota / private mode */
  }
  return "collapsed";
}

export function writeSidebarState(next: SidebarState): void {
  sidebarStateMemory = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
}

/** Clears in-memory sidebar preference after session wipe; syncs mounted AppShells. */
export function resetSidebarStateForSessionClear(): void {
  sidebarStateMemory = null;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SIDEBAR_STATE_RESET_EVENT));
}
