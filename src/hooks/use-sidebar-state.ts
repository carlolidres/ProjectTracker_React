import { useCallback, useEffect, useState } from "react";
import {
  readSidebarState,
  resetSidebarStateForSessionClear,
  SIDEBAR_STATE_RESET_EVENT,
  type SidebarState,
  writeSidebarState,
} from "@/lib/sidebarSessionState";

export type { SidebarState };
export { resetSidebarStateForSessionClear };

export function useSidebarState() {
  const [state, setState] = useState<SidebarState>(readSidebarState);

  useEffect(() => {
    const onReset = () => {
      writeSidebarState("collapsed");
      setState("collapsed");
    };
    window.addEventListener(SIDEBAR_STATE_RESET_EVENT, onReset);
    return () => window.removeEventListener(SIDEBAR_STATE_RESET_EVENT, onReset);
  }, []);

  const toggle = useCallback(() => {
    setState((current) => {
      const next: SidebarState = current === "expanded" ? "collapsed" : "expanded";
      writeSidebarState(next);
      return next;
    });
  }, []);

  const expand = useCallback(() => {
    writeSidebarState("expanded");
    setState("expanded");
  }, []);

  return { state, toggle, expand };
}
