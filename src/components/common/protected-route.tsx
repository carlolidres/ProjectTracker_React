import { Spin } from "antd";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { canAccessRoute } from "@/lib/roleAccess";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loading">
        <Spin size="large" aria-label="Loading session" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (profile && !canAccessRoute(profile.role, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
