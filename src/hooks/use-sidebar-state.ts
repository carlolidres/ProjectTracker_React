import { useCallback, useState } from "react";

export type SidebarState = "expanded" | "collapsed";

const STORAGE_KEY = "pt.sidebar.state";

/** Survives AppShell remounts on route change (each page owns its own AppShell). */
let sidebarStateMemory: SidebarState | null = null;

function readStoredState(): SidebarState {
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

function writeStoredState(next: SidebarState) {
  sidebarStateMemory = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
}

export function useSidebarState() {
  const [state, setState] = useState<SidebarState>(readStoredState);

  const toggle = useCallback(() => {
    setState((current) => {
      const next: SidebarState = current === "expanded" ? "collapsed" : "expanded";
      writeStoredState(next);
      return next;
    });
  }, []);

  const expand = useCallback(() => {
    writeStoredState("expanded");
    setState("expanded");
  }, []);

  return { state, toggle, expand };
}
