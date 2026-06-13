import { App as AntApp, Spin } from "antd";
import { HashRouter } from "react-router-dom";
import { AppRouter } from "@/app/router";
import { AuthProvider, useAuth } from "@/app/auth-provider";
import { MeetingViewProvider } from "@/app/meeting-view-provider";
import { DateAdjustmentProvider } from "@/app/date-adjustment-provider";
import { RegistryProvider } from "@/app/registry-provider";
import { ThemeProvider } from "@/app/theme-provider";

function SessionScopedRouter() {
  const { user, initializing, sessionEpoch } = useAuth();
  const sessionKey = `${user?.id ?? "anonymous"}:${sessionEpoch}`;

  if (initializing) {
    return (
      <div className="page-loading">
        <Spin size="large" aria-label="Loading session" />
      </div>
    );
  }

  return (
    <HashRouter key={sessionKey}>
      <RegistryProvider>
        <DateAdjustmentProvider>
          <MeetingViewProvider>
            <AppRouter key={sessionKey} />
          </MeetingViewProvider>
        </DateAdjustmentProvider>
      </RegistryProvider>
    </HashRouter>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AntApp>
        <AuthProvider>
          <SessionScopedRouter />
        </AuthProvider>
      </AntApp>
    </ThemeProvider>
  );
}

