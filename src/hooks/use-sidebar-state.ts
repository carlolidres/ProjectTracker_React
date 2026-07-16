import { useCallback, useState } from "react";

export type SidebarState = "expanded" | "collapsed";

export function useSidebarState() {
  const [state, setState] = useState<SidebarState>("expanded");

  const toggle = useCallback(() => {
    setState((current) => (current === "expanded" ? "collapsed" : "expanded"));
  }, []);

  const expand = useCallback(() => {
    setState("expanded");
  }, []);

  return { state, toggle, expand };
}
