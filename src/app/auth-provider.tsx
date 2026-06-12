import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchProfile } from "@/lib/auth";
import { clearAppSessionState } from "@/lib/sessionCleanup";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
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
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

  const refreshProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const currentUser = data.user ?? null;
      const nextUserId = currentUser?.id ?? null;
      if (lastUserIdRef.current && nextUserId && lastUserIdRef.current !== nextUserId) {
        clearAppSessionState();
        setProfile(null);
      }

      lastUserIdRef.current = nextUserId;
      setUser(currentUser);
      setProfile(await loadSessionProfile(currentUser));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshProfile();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const previousUserId = lastUserIdRef.current;

      if (event === "SIGNED_OUT" || !nextUserId) {
        lastUserIdRef.current = null;
        clearAppSessionState();
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" || (previousUserId && previousUserId !== nextUserId)) {
        clearAppSessionState();
        setProfile(null);
      }

      lastUserIdRef.current = nextUserId;
      setUser(nextUser);
      setLoading(true);
      void loadSessionProfile(nextUser)
        .then(setProfile)
        .finally(() => setLoading(false));
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, refreshProfile }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

