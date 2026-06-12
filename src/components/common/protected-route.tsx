import { Button, Result, Spin } from "antd";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { signOut } from "@/lib/auth";
import type { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || (user && !profile)) {
    return (
      <div className="page-loading">
        <Spin size="large" aria-label="Loading session" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
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

