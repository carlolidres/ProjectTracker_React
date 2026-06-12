import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Select, Space, Table, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { listProfiles, updateProfileAccess } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import type { Profile, UserRole } from "@/types";

const ROLE_OPTIONS = (Object.entries(ROLE_LABELS) as [UserRole, string][]).map(
  ([value, label]) => ({ value, label }),
);

const STATUS_OPTIONS: { value: Profile["status"]; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

interface AccessDraft {
  role: UserRole;
  status: Profile["status"];
}

export function AdminUsersPage() {
  const { profile: currentProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AccessDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextProfiles = await listProfiles();
      setProfiles(nextProfiles);
      setDrafts(
        Object.fromEntries(
          nextProfiles.map((profile) => [
            profile.id,
            {
              role: profile.status === "pending"
                ? profile.requested_role ?? profile.role
                : profile.role,
              status: profile.status,
            },
          ]),
        ),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentProfile?.role === "admin") void loadProfiles();
    else setLoading(false);
  }, [currentProfile?.role, loadProfiles]);

  function updateDraft(userId: string, patch: Partial<AccessDraft>) {
    setDrafts((current) => ({
      ...current,
      [userId]: { ...current[userId], ...patch },
    }));
  }

  async function saveAccess(profile: Profile) {
    const draft = drafts[profile.id];
    if (!draft) return;
    setSavingUserId(profile.id);
    setError(null);
    try {
      await updateProfileAccess(profile.id, draft.role, draft.status);
      message.success(`Access updated for ${profile.email}`);
      await loadProfiles();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update user access.");
    } finally {
      setSavingUserId(null);
    }
  }

  if (currentProfile?.role !== "admin") {
    return (
      <AppShell>
        <Alert
          type="error"
          showIcon
          message="Administrator access required"
          description="Only active administrators can review and approve user accounts."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>User Management</Typography.Title>
          <Typography.Text type="secondary">
            Review signup requests, assign roles, and activate or deactivate accounts.
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void loadProfiles()} loading={loading}>
          Refresh
        </Button>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Card>
        <Table
          rowKey="id"
          dataSource={profiles}
          loading={loading}
          pagination={{ pageSize: 20 }}
          columns={[
            {
              title: "User",
              render: (_, profile: Profile) => (
                <Space direction="vertical" size={0}>
                  <Typography.Text strong>{profile.full_name || "Unnamed user"}</Typography.Text>
                  <Typography.Text type="secondary">{profile.email}</Typography.Text>
                </Space>
              ),
            },
            {
              title: "Requested Role",
              render: (_, profile: Profile) =>
                profile.requested_role ? ROLE_LABELS[profile.requested_role] : "Not specified",
            },
            {
              title: "Assigned Role",
              render: (_, profile: Profile) => (
                <Select
                  value={drafts[profile.id]?.role}
                  options={ROLE_OPTIONS}
                  style={{ minWidth: 140 }}
                  onChange={(role: UserRole) => updateDraft(profile.id, { role })}
                />
              ),
            },
            {
              title: "Status",
              render: (_, profile: Profile) => (
                <Select
                  value={drafts[profile.id]?.status}
                  options={STATUS_OPTIONS}
                  style={{ minWidth: 120 }}
                  onChange={(status: Profile["status"]) => updateDraft(profile.id, { status })}
                />
              ),
            },
            {
              title: "Current",
              render: (_, profile: Profile) => (
                <Tag color={profile.status === "active" ? "green" : profile.status === "pending" ? "gold" : "red"}>
                  {profile.status.toUpperCase()}
                </Tag>
              ),
            },
            {
              title: "Action",
              render: (_, profile: Profile) => (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={savingUserId === profile.id}
                  onClick={() => void saveAccess(profile)}
                >
                  Save
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </AppShell>
  );
}
