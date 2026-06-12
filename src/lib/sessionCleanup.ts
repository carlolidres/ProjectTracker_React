const APP_SESSION_PREFIX = "project-tracker:";

/**
 * Clears browser-persisted app state so the next authenticated user starts fresh.
 */
export function clearAppSessionState(): void {
  if (typeof window === "undefined") return;

  sessionStorage.clear();

  const localKeys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(APP_SESSION_PREFIX)) {
      localKeys.push(key);
    }
  }

  localKeys.forEach((key) => localStorage.removeItem(key));
}

/** Removes Supabase auth tokens persisted in localStorage. */
export function clearSupabaseAuthStorage(): void {
  if (typeof window === "undefined") return;

  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("sb-")) {
      keys.push(key);
    }
  }

  keys.forEach((key) => localStorage.removeItem(key));
}

/** Hard navigation so the SPA remounts with a clean in-memory session. */
export function redirectToLoginForFreshSession(): void {
  if (typeof window === "undefined") return;

  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  window.location.replace(`${normalizedBase}#/login`);
  window.location.reload();
}

export function getAppSessionStorageKey(userId: string, key: string): string {
  return `${APP_SESSION_PREFIX}${userId}:${key}`;
}
