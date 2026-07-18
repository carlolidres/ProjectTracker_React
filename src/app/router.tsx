import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/common/protected-route";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProjectEntryPage } from "@/features/projects/ProjectEntryPage";
import { ProjectsDatabasePage } from "@/features/projects/ProjectsDatabasePage";
import { SupportActivitiesPage } from "@/features/support-activities/SupportActivitiesPage";
import { AuditTrailPage } from "@/features/audit-trail/AuditTrailPage";
import { LessonsLearnedPage } from "@/features/lessons-learned/LessonsLearnedPage";
import { ArchivedPage } from "@/features/archived/ArchivedPage";
import { RegistryPage } from "@/features/registry/RegistryPage";
import { AdminUsersPage } from "@/features/admin/AdminUsersPage";
import { AccessMatrixPage } from "@/features/admin/AccessMatrixPage";
import { CnfTrackerPage } from "@/features/cnf-tracker/CnfTrackerPage";
import { EndorsementTrackerPage } from "@/features/endorsement-tracker/EndorsementTrackerPage";
import { DataMapPage } from "@/features/admin/DataMapPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><ProjectEntryPage /></ProtectedRoute>} />
      <Route path="/projects/database" element={<ProtectedRoute><ProjectsDatabasePage /></ProtectedRoute>} />
      <Route path="/support-activities" element={<ProtectedRoute><SupportActivitiesPage /></ProtectedRoute>} />
      <Route path="/cnf-tracker" element={<ProtectedRoute><CnfTrackerPage /></ProtectedRoute>} />
      <Route path="/endorsement-tracker" element={<ProtectedRoute><EndorsementTrackerPage /></ProtectedRoute>} />
      <Route path="/lessons-learned" element={<ProtectedRoute><LessonsLearnedPage /></ProtectedRoute>} />
      <Route path="/audit-trail" element={<ProtectedRoute><AuditTrailPage /></ProtectedRoute>} />
      <Route
        path="/archived"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ArchivedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/registry"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <RegistryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/access"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AccessMatrixPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/data-map"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DataMapPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
