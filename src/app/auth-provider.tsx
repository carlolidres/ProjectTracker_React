import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchProfile } from "@/lib/auth";
import { clearAppSessionState } from "@/lib/sessionCleanup";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  initializing: boolean;
  sessionEpoch: number;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadSessionProfile(user: User | null): Promise<Profile | null> {
  if (!user) return null;
  return fetchProfile(user.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const lastUserIdRef = useRef<string | null>(null);

  const refreshProfile = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    const currentUser = data.user ?? null;
    const nextUserId = currentUser?.id ?? null;
    if (lastUserIdRef.current && nextUserId && lastUserIdRef.current !== nextUserId) {
      clearAppSessionState();
      setSessionEpoch((current) => current + 1);
    }

    lastUserIdRef.current = nextUserId;
    setUser(currentUser);
    setProfile(await loadSessionProfile(currentUser));
  };

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const previousUserId = lastUserIdRef.current;

      if (event === "SIGNED_OUT" || !nextUserId) {
        lastUserIdRef.current = null;
        clearAppSessionState();
        setUser(null);
        setProfile(null);
        setSessionEpoch((current) => current + 1);
        setInitializing(false);
        return;
      }

      // Tab/window focus can refresh the JWT without changing the signed-in user.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        lastUserIdRef.current = nextUserId;
        setUser(nextUser);
        return;
      }

      const userChanged = Boolean(previousUserId && previousUserId !== nextUserId);
      if (event === "SIGNED_IN" || userChanged) {
        clearAppSessionState();
        setProfile(null);
        setSessionEpoch((current) => current + 1);
      }

      lastUserIdRef.current = nextUserId;
      setUser(nextUser);

      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || userChanged) {
        setInitializing(true);
        void loadSessionProfile(nextUser)
          .then(setProfile)
          .finally(() => setInitializing(false));
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({ user, profile, initializing, sessionEpoch, refreshProfile }),
    [user, profile, initializing, sessionEpoch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
