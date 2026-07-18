import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/app/auth-provider";
import {
  canMenu,
  canMenuPath,
  isMenuMatrixEnabled,
  setMenuPermissionOverrideCache,
  type MenuAction,
  type MenuKey,
  type MenuPermissionOverride,
} from "@/lib/menuPermissions";
import { listMenuPermissionOverrides } from "@/services/menuPermissionService";

interface MenuPermissionContextValue {
  enabled: boolean;
  loading: boolean;
  overrides: MenuPermissionOverride[];
  refresh: () => Promise<void>;
  can: (menu: MenuKey, action: MenuAction) => boolean;
  canPath: (path: string, action: MenuAction) => boolean;
}

const MenuPermissionContext = createContext<MenuPermissionContextValue | null>(null);

export function MenuPermissionProvider({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();
  const enabled = isMenuMatrixEnabled();
  const [overrides, setOverrides] = useState<MenuPermissionOverride[]>([]);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled || !user) {
      setOverrides([]);
      setMenuPermissionOverrideCache([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listMenuPermissionOverrides();
      setOverrides(rows);
      setMenuPermissionOverrideCache(rows);
    } catch {
      setOverrides([]);
      setMenuPermissionOverrideCache([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<MenuPermissionContextValue>(
    () => ({
      enabled,
      loading,
      overrides,
      refresh,
      can: (menu, action) => canMenu(profile?.role, menu, action, overrides),
      canPath: (path, action) => canMenuPath(profile?.role, path, action, overrides),
    }),
    [enabled, loading, overrides, profile?.role, refresh],
  );

  return (
    <MenuPermissionContext.Provider value={value}>{children}</MenuPermissionContext.Provider>
  );
}

export function useMenuPermissions(): MenuPermissionContextValue {
  const ctx = useContext(MenuPermissionContext);
  if (!ctx) {
    return {
      enabled: isMenuMatrixEnabled(),
      loading: false,
      overrides: [],
      refresh: async () => undefined,
      can: (menu, action) => canMenu(undefined, menu, action, []),
      canPath: (path, action) => canMenuPath(undefined, path, action, []),
    };
  }
  return ctx;
}
