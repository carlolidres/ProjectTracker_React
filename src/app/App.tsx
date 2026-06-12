import { App as AntApp } from "antd";
import { AppRouter } from "@/app/router";
import { AuthProvider } from "@/app/auth-provider";
import { ThemeProvider } from "@/app/theme-provider";

export function App() {
  return (
    <ThemeProvider>
      <AntApp>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </AntApp>
    </ThemeProvider>
  );
}
