import { Button, Result, Spin, message } from "antd";
import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { ForcePasswordChangeScreen } from "@/components/common/force-password-change";
import { signOut } from "@/lib/auth";
import { canAccessRoute } from "@/lib/roleAccess";
import { diagLog, useDiagLifecycle } from "@/lib/sessionDiagnostics";
import type { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, initializing } = useAuth();
  const { overrides, enabled: matrixEnabled } = useMenuPermissions();
  const location = useLocation();
  const deniedToastRef = useRef<string | null>(null);
  useDiagLifecycle(`ProtectedRoute(${location.pathname})`);

  const sessionPending = initializing || Boolean(user && !profile);

  if (!sessionPending && !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (sessionPending && user) {
    diagLog("route", `session overlay (children kept mounted): ${location.pathname}`, {
      initializing,
      hasProfile: Boolean(profile),
    });
    return (
      <div className="protected-route-session-pending">
        <div className="page-loading page-loading--overlay">
          <Spin size="large" aria-label="Loading session" />
        </div>
        {children}
      </div>
    );
  }

  if (sessionPending) {
    diagLog("route", `blocking spinner (no user yet): ${location.pathname}`);
    return (
      <div className="page-loading">
        <Spin size="large" aria-label="Loading session" />
      </div>
    );
  }

  if (profile?.must_change_password) {
    return <ForcePasswordChangeScreen />;
  }

  if (profile?.status !== "active") {
    const isPending = profile?.status === "pending";
    return (
      <Result
        status={isPending ? "info" : "warning"}
        title={isPending ? "Account awaiting approval" : "Account inactive"}
        subTitle={
          isPending
            ? "An administrator must approve your requested role before you can access Project Tracker."
            : "Your account has been deactivated. Contact an administrator for assistance."
        }
        extra={
          <Button
            type="primary"
            onClick={async () => {
              await signOut();
            }}
          >
            Back to sign in
          </Button>
        }
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const pathAllowed = canAccessRoute(profile.role, location.pathname, overrides);
  if (!pathAllowed) {
    return <MenuAccessDeniedRedirect pathname={location.pathname} toastKeyRef={deniedToastRef} />;
  }

  // Suppress unused when matrix off — still keep provider wired.
  void matrixEnabled;

  return children;
}

function MenuAccessDeniedRedirect({
  pathname,
  toastKeyRef,
}: {
  pathname: string;
  toastKeyRef: React.MutableRefObject<string | null>;
}) {
  useEffect(() => {
    if (toastKeyRef.current === pathname) return;
    toastKeyRef.current = pathname;
    message.warning("You do not have access to that page.");
  }, [pathname, toastKeyRef]);
  return <Navigate to="/dashboard" replace />;
}
