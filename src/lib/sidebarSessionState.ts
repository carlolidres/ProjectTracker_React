export type SidebarState = "expanded" | "collapsed";

export const SIDEBAR_STATE_RESET_EVENT = "pt:sidebar-state-reset";
export const DEFAULT_SIDEBAR_STATE: SidebarState = "expanded";

/** Survives AppShell remounts on route change (each page owns its own AppShell). */
let sidebarStateMemory: SidebarState | null = null;

export function readSidebarState(): SidebarState {
  if (sidebarStateMemory === "expanded" || sidebarStateMemory === "collapsed") {
    return sidebarStateMemory;
  }
  return DEFAULT_SIDEBAR_STATE;
}

export function writeSidebarState(next: SidebarState): void {
  sidebarStateMemory = next;
}

/** Clears in-memory sidebar preference after session wipe; syncs mounted AppShells. */
export function resetSidebarStateForSessionClear(): void {
  sidebarStateMemory = null;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SIDEBAR_STATE_RESET_EVENT));
}
