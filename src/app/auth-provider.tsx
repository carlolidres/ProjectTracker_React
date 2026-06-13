import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchProfile } from "@/lib/auth";
import { clearAppSessionState } from "@/lib/sessionCleanup";
import { diagLog } from "@/lib/sessionDiagnostics";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  initializing: boolean;
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
  const lastUserIdRef = useRef<string | null>(null);
  const bootstrappedRef = useRef(false);
  const profileRef = useRef<Profile | null>(null);
  profileRef.current = profile;

  const refreshProfile = async () => {
    diagLog("auth", "refreshProfile()");
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    const currentUser = data.user ?? null;
    const nextUserId = currentUser?.id ?? null;
    if (lastUserIdRef.current && nextUserId && lastUserIdRef.current !== nextUserId) {
      diagLog("auth", "refreshProfile detected user switch", {
        from: lastUserIdRef.current,
        to: nextUserId,
      });
      clearAppSessionState();
    }

    lastUserIdRef.current = nextUserId;
    setUser(currentUser);
    applySetProfile(await loadSessionProfile(currentUser));
  };

  const applySetProfile = (next: Profile | null) => {
    if (next === null) diagLog("auth-state", "setProfile(null)");
    setProfile(next);
  };

  const applySetInitializing = (next: boolean) => {
    if (next) diagLog("auth-state", "setInitializing(true)");
    else diagLog("auth-state", "setInitializing(false)");
    setInitializing(next);
  };

  useEffect(() => {
    diagLog("lifecycle", "AuthProvider mounted");
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const previousUserId = lastUserIdRef.current;

      diagLog("auth-event", event, {
        nextUserId,
        previousUserId,
        bootstrapped: bootstrappedRef.current,
      });

      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        lastUserIdRef.current = nextUserId;
        if (nextUser) setUser(nextUser);
        return;
      }

      if (event === "SIGNED_OUT") {
        diagLog("auth", "SIGNED_OUT → clearAppSessionState()");
        bootstrappedRef.current = false;
        lastUserIdRef.current = null;
        clearAppSessionState();
        setUser(null);
        applySetProfile(null);
        applySetInitializing(false);
        return;
      }

      if (!nextUserId) {
        if (!bootstrappedRef.current) {
          setUser(null);
          applySetProfile(null);
          applySetInitializing(false);
        }
        return;
      }

      if (event === "INITIAL_SESSION") {
        if (bootstrappedRef.current) {
          diagLog("auth", "ignored duplicate INITIAL_SESSION");
          return;
        }
        bootstrappedRef.current = true;
        lastUserIdRef.current = nextUserId;
        setUser(nextUser);
        applySetInitializing(true);
        void loadSessionProfile(nextUser)
          .then(applySetProfile)
          .finally(() => applySetInitializing(false));
        return;
      }

      if (event === "SIGNED_IN") {
        const userChanged = Boolean(previousUserId && previousUserId !== nextUserId);
        if (userChanged) {
          diagLog("auth", "SIGNED_IN user changed → clearAppSessionState()");
          clearAppSessionState();
          applySetProfile(null);
        }
        lastUserIdRef.current = nextUserId;
        setUser(nextUser);
        if (!profileRef.current || userChanged || previousUserId === null) {
          void loadSessionProfile(nextUser).then(applySetProfile);
        }
        applySetInitializing(false);
        bootstrappedRef.current = true;
        return;
      }

      lastUserIdRef.current = nextUserId;
      setUser(nextUser);
    });

    return () => {
      diagLog("lifecycle", "AuthProvider unmounted");
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ user, profile, initializing, refreshProfile }),
    [user, profile, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
