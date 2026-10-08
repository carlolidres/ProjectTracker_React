import { createClient, type Session } from "@supabase/supabase-js";
import { adoptBoardSessionHandoff, BOARD_WINDOW_NAME } from "@/lib/boardSessionHandoff";

adoptBoardSessionHandoff();

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const boardWindow = typeof window !== "undefined" && window.name === BOARD_WINDOW_NAME;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables are missing. Auth and data features will not work until .env.local is configured.");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    persistSession: true,
    storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
    autoRefreshToken: !boardWindow,
    detectSessionInUrl: !boardWindow,
  },
});

let liveSession: Session | null = null;

supabase.auth.onAuthStateChange((_event, session) => {
  liveSession = session;
});

/** Sign-in already loaded in this tab. Used when opening the board window. */
export function readLiveAuthSession(): Session | null {
  return liveSession;
}

export function authStorageKey(): string {
  if (!supabaseUrl) return "";
  try {
    return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  } catch {
    return "";
  }
}
