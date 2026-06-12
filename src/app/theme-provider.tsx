import { ConfigProvider, theme as antTheme } from "antd";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type AppTheme = "light" | "dark";

interface ThemeContextValue {
  appTheme: AppTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appTheme, setAppTheme] = useState<AppTheme>("light");

  const toggleTheme = useCallback(() => {
    setAppTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(() => ({ appTheme, toggleTheme }), [appTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={{
          algorithm: appTheme === "dark" ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
          token: { colorPrimary: "#1677ff", borderRadius: 8 },
        }}
      >
        <div data-theme={appTheme}>{children}</div>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useAppTheme must be used within ThemeProvider");
  return context;
}
