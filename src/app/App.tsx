import { App as AntApp } from "antd";
import { HashRouter, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppRouter } from "@/app/router";
import { AuthProvider } from "@/app/auth-provider";
import { MeetingViewProvider } from "@/app/meeting-view-provider";
import { DateAdjustmentProvider } from "@/app/date-adjustment-provider";
import { RegistryProvider } from "@/app/registry-provider";
import { ThemeProvider } from "@/app/theme-provider";
import { diagLog, useDiagLifecycle, usePageVisibilityDiagnostics } from "@/lib/sessionDiagnostics";

function RouteChangeLogger() {
  const location = useLocation();
  useEffect(() => {
    diagLog("route", "navigation", { pathname: location.pathname, search: location.search });
  }, [location.pathname, location.search]);
  return null;
}

function SessionScopedRouter() {
  useDiagLifecycle("SessionScopedRouter");

  return (
    <HashRouter>
      <RouteChangeLogger />
      <RegistryProvider>
        <DateAdjustmentProvider>
          <MeetingViewProvider>
            <AppRouter />
          </MeetingViewProvider>
        </DateAdjustmentProvider>
      </RegistryProvider>
    </HashRouter>
  );
}

export function App() {
  useDiagLifecycle("App");
  usePageVisibilityDiagnostics();
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