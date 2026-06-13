import { useEffect } from "react";

const ENABLED =
  import.meta.env.DEV
  || import.meta.env.VITE_AUTH_DIAGNOSTICS === "true";

export function diagLog(category: string, message: string, detail?: unknown): void {
  if (!ENABLED) return;
  if (detail === undefined) {
    console.info(`[ProjectTracker:${category}] ${message}`);
    return;
  }
  console.info(`[ProjectTracker:${category}] ${message}`, detail);
}

export function useDiagLifecycle(component: string): void {
  useEffect(() => {
    diagLog("lifecycle", `${component} mounted`);
    return () => {
      diagLog("lifecycle", `${component} unmounted`);
    };
  }, [component]);
}

/** Logs tab visibility, focus, and bfcache restores to distinguish unmount vs full reload. */
export function usePageVisibilityDiagnostics(): void {
  useEffect(() => {
    const onVisibility = () => {
      diagLog("page", "visibilitychange", {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      });
    };
    const onFocus = () => diagLog("page", "window focus");
    const onBlur = () => diagLog("page", "window blur");
    const onPageShow = (event: PageTransitionEvent) => {
      diagLog("page", "pageshow", { persisted: event.persisted });
      if (!event.persisted) {
        diagLog(
          "page",
          "full document load detected — common after browser discards a minimized window/tab",
        );
      }
    };
    const onPageHide = (event: PageTransitionEvent) => {
      diagLog("page", "pagehide", { persisted: event.persisted });
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);
}
