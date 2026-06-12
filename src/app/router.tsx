import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/common/protected-route";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProjectEntryPage } from "@/features/projects/ProjectEntryPage";
import { ProjectsDatabasePage } from "@/features/projects/ProjectsDatabasePage";
import { SupportActivitiesPage } from "@/features/support-activities/SupportActivitiesPage";
import { AuditTrailPage } from "@/features/audit-trail/AuditTrailPage";
import { ArchivedPage } from "@/features/archived/ArchivedPage";
import { RegistryPage } from "@/features/registry/RegistryPage";
import { AdminUsersPage } from "@/features/admin/AdminUsersPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><ProjectEntryPage /></ProtectedRoute>} />
      <Route path="/projects/database" element={<ProtectedRoute><ProjectsDatabasePage /></ProtectedRoute>} />
      <Route path="/support-activities" element={<ProtectedRoute><SupportActivitiesPage /></ProtectedRoute>} />
      <Route path="/audit-trail" element={<ProtectedRoute><AuditTrailPage /></ProtectedRoute>} />
      <Route path="/archived" element={<ProtectedRoute><ArchivedPage /></ProtectedRoute>} />
      <Route path="/registry" element={<ProtectedRoute><RegistryPage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
