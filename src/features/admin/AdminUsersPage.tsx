import { KeyOutlined, ReloadOutlined, SaveOutlined, SearchOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Input, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { listProfiles, updateProfileAccess } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { getProfileShortName } from "@/lib/profileName";
import {
  adminCompletePasswordReset,
  listPendingPasswordResetRequests,
} from "@/services/passwordResetService";
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
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [pendingResetUserIds, setPendingResetUserIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextProfiles = await listProfiles();
      let pendingResets: Awaited<ReturnType<typeof listPendingPasswordResetRequests>> = [];
      try {
        pendingResets = await listPendingPasswordResetRequests();
      } catch {
        pendingResets = [];
      }
      setProfiles(nextProfiles);
      setPendingResetUserIds(new Set(pendingResets.map((request) => request.user_id)));
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

  const pendingResetCount = useMemo(() => pendingResetUserIds.size, [pendingResetUserIds]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter((profile) => {
      const draft = drafts[profile.id];
      const blob = [
        getProfileShortName(profile),
        profile.email,
        profile.full_name,
        profile.first_name,
        profile.last_name,
        profile.role,
        profile.requested_role,
        ROLE_LABELS[profile.role],
        profile.requested_role ? ROLE_LABELS[profile.requested_role] : "",
        profile.status,
        draft?.role,
        draft?.status,
        draft?.role ? ROLE_LABELS[draft.role] : "",
        pendingResetUserIds.has(profile.id) ? "password reset requested" : "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(query);
    });
  }, [drafts, pendingResetUserIds, profiles, search]);

  async function handlePasswordReset(profile: Profile) {
    setResettingUserId(profile.id);
    setError(null);
    try {
      await adminCompletePasswordReset(profile.id);
      message.success(`Password reset for ${getProfileShortName(profile) || profile.email}`);
      await loadProfiles();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Failed to reset password.");
    } finally {
      setResettingUserId(null);
    }
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
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void loadProfiles()} loading={loading}>
          Refresh
        </Button>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
      {pendingResetCount > 0 ? (
        <Alert
          type="warning"
          showIcon
          message={`${pendingResetCount} password reset request${pendingResetCount === 1 ? "" : "s"} pending review`}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {!loading ? (
        <Card className="admin-users-search-card" style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search users by name, email, role, or status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Card>
      ) : null}

      <Card>
        <Table
          rowKey="id"
          dataSource={filteredProfiles}
          loading={loading}
          pagination={{ pageSize: 20 }}
          columns={[
            {
              title: "User",
              render: (_, profile: Profile) => {
                const shortName = getProfileShortName(profile) || "Unnamed user";
                return (
                  <Space direction="vertical" size={0}>
                    <Typography.Text strong>{shortName}</Typography.Text>
                    <Typography.Text type="secondary">{profile.email}</Typography.Text>
                    {pendingResetUserIds.has(profile.id) ? (
                      <Tag color="orange">Password reset requested</Tag>
                    ) : null}
                  </Space>
                );
              },
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
                <Space direction="vertical" size={8}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={savingUserId === profile.id}
                    onClick={() => void saveAccess(profile)}
                    block
                  >
                    Save
                  </Button>
                  {pendingResetUserIds.has(profile.id) ? (
                    <Popconfirm
                      title="Reset password?"
                      description="This sets the user's password to the default reset password."
                      okText="Reset password"
                      onConfirm={() => void handlePasswordReset(profile)}
                    >
                      <Button
                        danger
                        icon={<KeyOutlined />}
                        loading={resettingUserId === profile.id}
                        block
                      >
                        Reset Password
                      </Button>
                    </Popconfirm>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </AppShell>
  );
}
