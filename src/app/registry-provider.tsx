import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/app/auth-provider";
import { getRegistryBundle } from "@/services/registryService";

interface RegistryContextValue {
  registry: Record<string, string[]>;
  loading: boolean;
  refreshRegistry: () => Promise<void>;
}

const RegistryContext = createContext<RegistryContextValue | null>(null);

export function RegistryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [registry, setRegistry] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const refreshRegistry = useCallback(async () => {
    setLoading(true);
    try {
      setRegistry(await getRegistryBundle());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setRegistry({});
      return;
    }
    void refreshRegistry();
  }, [user, refreshRegistry]);

  const value = useMemo(
    () => ({ registry, loading, refreshRegistry }),
    [registry, loading, refreshRegistry],
  );

  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>;
}

export function useRegistry() {
  const context = useContext(RegistryContext);
  if (!context) {
    throw new Error("useRegistry must be used within RegistryProvider");
  }
  return context;
}
