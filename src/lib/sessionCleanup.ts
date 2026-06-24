import { clearAllFormDrafts } from "@/lib/formDraftStorage";
import { diagLog } from "@/lib/sessionDiagnostics";

const APP_SESSION_PREFIX = "project-tracker:";

function isSupabaseAuthKey(key: string): boolean {
  return key.startsWith("sb-");
}

function collectKeys(storage: Storage, predicate: (key: string) => boolean): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && predicate(key)) keys.push(key);
  }
  return keys;
}

/**
 * Clears browser-persisted app state so the next authenticated user starts fresh.
 * Preserves Supabase auth tokens in sessionStorage unless explicitly cleared via sign-out.
 */
export function clearAppSessionState(): void {
  if (typeof window === "undefined") return;

  diagLog("session", "clearAppSessionState()");
  collectKeys(sessionStorage, (key) => !isSupabaseAuthKey(key)).forEach((key) => {
    sessionStorage.removeItem(key);
  });
  clearAllFormDrafts();

  collectKeys(localStorage, (key) => key.startsWith(APP_SESSION_PREFIX)).forEach((key) => {
    localStorage.removeItem(key);
  });
}

/** Removes Supabase auth tokens from sessionStorage and legacy localStorage keys. */
export function clearSupabaseAuthStorage(): void {
  if (typeof window === "undefined") return;

  for (const storage of [sessionStorage, localStorage]) {
    collectKeys(storage, isSupabaseAuthKey).forEach((key) => storage.removeItem(key));
  }
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
