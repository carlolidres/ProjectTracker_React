const APP_SESSION_PREFIX = "project-tracker:";



/**

 * Clears browser-persisted app state so the next authenticated user starts fresh.

 * Supabase auth tokens are cleared separately via signOut().

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



export function getAppSessionStorageKey(userId: string, key: string): string {

  return `${APP_SESSION_PREFIX}${userId}:${key}`;

}


