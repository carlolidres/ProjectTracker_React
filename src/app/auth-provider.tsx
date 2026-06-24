import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchProfile } from "@/lib/auth";
import {
  clearAppSessionState,
  clearSupabaseAuthStorage,
  redirectToLoginForFreshSession,
} from "@/lib/sessionCleanup";
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
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

async function loadSessionProfile(user: User | null): Promise<Profile | null> {
  if (!user) return null;
  return fetchProfile(user.id);
}

function isSessionMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : "";
  return name === "AuthSessionMissingError" || message.toLowerCase().includes("auth session missing");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);
  const bootstrappedRef = useRef(false);
  const profileRef = useRef<Profile | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  const expiringSessionRef = useRef(false);
  const profileLoadRef = useRef<Promise<void> | null>(null);
  const profileLoadUserIdRef = useRef<string | null>(null);
  profileRef.current = profile;

  const handleMissingSession = () => {
    if (expiringSessionRef.current) return;
    expiringSessionRef.current = true;
    diagLog("auth", "missing session → clear state and redirect to login");
    bootstrappedRef.current = false;
    lastUserIdRef.current = null;
    clearAppSessionState();
    clearSupabaseAuthStorage();
    setUser(null);
    applySetProfile(null);
    applySetInitializing(false);
    redirectToLoginForFreshSession();
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

  const loadProfileForUser = async (currentUser: User, reason: string) => {
    if (profileLoadRef.current && profileLoadUserIdRef.current === currentUser.id) {
      diagLog("auth", `profile load already in flight (${reason})`);
      return profileLoadRef.current;
    }

    const load = (async () => {
      diagLog("auth", `loadProfileForUser (${reason})`, { userId: currentUser.id });
      applySetInitializing(true);
      try {
        applySetProfile(await loadSessionProfile(currentUser));
      } finally {
        applySetInitializing(false);
      }
    })();

    profileLoadUserIdRef.current = currentUser.id;
    profileLoadRef.current = load;
    try {
      await load;
    } finally {
      if (profileLoadRef.current === load) {
        profileLoadRef.current = null;
        profileLoadUserIdRef.current = null;
      }
    }
  };

  const refreshProfile = async () => {
    if (profileLoadRef.current) {
      diagLog("auth", "refreshProfile() skipped — load already in flight");
      return profileLoadRef.current;
    }

    const load = (async () => {
      diagLog("auth", "refreshProfile()");
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (isSessionMissingError(error)) {
          handleMissingSession();
          return;
        }
        throw error;
      }

      const currentUser = data.user ?? null;
      const nextUserId = currentUser?.id ?? null;
      const previousUserId = lastUserIdRef.current;

      if (previousUserId && nextUserId && previousUserId !== nextUserId) {
        diagLog("auth", "refreshProfile detected user switch", {
          from: previousUserId,
          to: nextUserId,
        });
        clearAppSessionState();
        applySetProfile(null);
      }

      if (!currentUser) {
        handleMissingSession();
        return;
      }

      lastUserIdRef.current = nextUserId;
      setUser(currentUser);
      applySetProfile(await loadSessionProfile(currentUser));
    })();

    profileLoadRef.current = load;
    try {
      await load;
    } finally {
      if (profileLoadRef.current === load) {
        profileLoadRef.current = null;
        profileLoadUserIdRef.current = null;
      }
    }
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
        diagLog("auth", "SIGNED_OUT → clear session storage");
        bootstrappedRef.current = false;
        lastUserIdRef.current = null;
        clearAppSessionState();
        clearSupabaseAuthStorage();
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
        void loadProfileForUser(nextUser!, "INITIAL_SESSION");
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
        bootstrappedRef.current = true;
        if (!profileRef.current || userChanged || previousUserId === null) {
          void loadProfileForUser(nextUser!, "SIGNED_IN");
        } else {
          applySetInitializing(false);
        }
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

  useEffect(() => {
    if (!user) {
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      expiringSessionRef.current = false;
      return;
    }

    expiringSessionRef.current = false;

    const expireSession = () => {
      if (expiringSessionRef.current) return;
      expiringSessionRef.current = true;
      diagLog("session", "inactivity timeout → sign out");
      clearAppSessionState();
      void supabase.auth.signOut({ scope: "global" })
        .catch(() => undefined)
        .finally(() => {
          clearSupabaseAuthStorage();
          redirectToLoginForFreshSession();
        });
    };

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = window.setTimeout(expireSession, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];

    resetInactivityTimer();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetInactivityTimer, { passive: true }));
    document.addEventListener("visibilitychange", resetInactivityTimer);

    return () => {
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetInactivityTimer));
      document.removeEventListener("visibilitychange", resetInactivityTimer);
    };
  }, [user]);

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
