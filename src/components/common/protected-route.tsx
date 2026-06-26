import { Button, Result, Spin } from "antd";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { ForcePasswordChangeScreen } from "@/components/common/force-password-change";
import { signOut } from "@/lib/auth";
import { diagLog, useDiagLifecycle } from "@/lib/sessionDiagnostics";
import type { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, initializing } = useAuth();
  const location = useLocation();
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

  return children;
}
