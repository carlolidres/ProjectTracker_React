import { Alert, Button, Card, Checkbox, Select, Space, Spin, Table, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { useMenuPermissions } from "@/app/menu-permission-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ROLE_LABELS } from "@/lib/constants";
import {
  ALL_MENU_KEYS,
  DEFAULT_MENU_PERMISSIONS,
  MENU_LABELS,
  MENU_NA_ACTIONS,
  type MenuAction,
  type MenuCapabilities,
  type MenuKey,
  type MenuPermissionOverride,
  isMenuMatrixEnabled,
  resolveMenuCapabilities,
} from "@/lib/menuPermissions";
import {
  deleteMenuPermissionOverride,
  upsertMenuPermissionOverride,
} from "@/services/menuPermissionService";
import type { UserRole } from "@/types";

const ROLE_OPTIONS: UserRole[] = ["am_bm_pl", "qa", "pp", "tsd", "val", "qc", "rnd", "view", "admin"];

interface MatrixRow {
  key: MenuKey;
  menu: MenuKey;
  label: string;
  caps: MenuCapabilities;
  isOverride: boolean;
  defaults: MenuCapabilities;
}

export function AccessMatrixPage() {
  const { user, profile } = useAuth();
  const { overrides, refresh, loading: overridesLoading } = useMenuPermissions();
  const [role, setRole] = useState<UserRole>("am_bm_pl");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const enabled = isMenuMatrixEnabled();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rows = useMemo<MatrixRow[]>(() => {
    return ALL_MENU_KEYS.map((menu) => {
      const defaults = DEFAULT_MENU_PERMISSIONS[role][menu];
      const override = overrides.find((row) => row.role === role && row.menu_key === menu);
      const caps = resolveMenuCapabilities(role, menu, overrides);
      return {
        key: menu,
        menu,
        label: MENU_LABELS[menu],
        caps,
        isOverride: Boolean(override),
        defaults,
      };
    });
  }, [overrides, role]);

  const saveCaps = useCallback(
    async (menu: MenuKey, next: MenuCapabilities) => {
      if (!user?.email) return;
      const key = `${role}:${menu}`;
      setSavingKey(key);
      try {
        const previous = overrides.find((row) => row.role === role && row.menu_key === menu) ?? null;
        const defaults = DEFAULT_MENU_PERMISSIONS[role][menu];
        const matchesDefault =
          next.can_view === defaults.can_view
          && next.can_create === defaults.can_create
          && next.can_edit === defaults.can_edit
          && next.can_export === defaults.can_export;

        if (matchesDefault) {
          if (previous) {
            await deleteMenuPermissionOverride(role, menu, user.email, previous);
            message.success("Restored default permissions.");
          }
        } else {
          const saved: MenuPermissionOverride = {
            role,
            menu_key: menu,
            ...next,
          };
          await upsertMenuPermissionOverride(saved, user.email, previous);
          message.success("Permission override saved.");
        }
        await refresh();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Failed to save permissions.");
      } finally {
        setSavingKey(null);
      }
    },
    [overrides, refresh, role, user?.email],
  );

  function toggle(menu: MenuKey, action: MenuAction, current: MenuCapabilities) {
    const na = MENU_NA_ACTIONS[menu] ?? [];
    if (na.includes(action)) return;
    const next = { ...current };
    if (action === "view") next.can_view = !current.can_view;
    if (action === "create") next.can_create = !current.can_create;
    if (action === "edit") next.can_edit = !current.can_edit;
    if (action === "export") next.can_export = !current.can_export;
    if (!next.can_view) {
      next.can_create = false;
      next.can_edit = false;
      next.can_export = false;
    }
    void saveCaps(menu, next);
  }

  const columns: ColumnsType<MatrixRow> = [
    {
      title: "Menu",
      dataIndex: "label",
      key: "label",
      fixed: "left",
      width: 200,
      render: (label: string, row) => (
        <Space direction="vertical" size={0}>
          <span>{label}</span>
          {row.isOverride ? (
            <Typography.Text type="warning" style={{ fontSize: 12 }}>
              Override
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Default
            </Typography.Text>
          )}
        </Space>
      ),
    },
    ...(["view", "create", "edit", "export"] as MenuAction[]).map((action) => ({
      title: action[0]!.toUpperCase() + action.slice(1),
      key: action,
      width: 100,
      align: "center" as const,
      render: (_: unknown, row: MatrixRow) => {
        const na = (MENU_NA_ACTIONS[row.menu] ?? []).includes(action);
        const checked =
          action === "view"
            ? row.caps.can_view
            : action === "create"
              ? row.caps.can_create
              : action === "edit"
                ? row.caps.can_edit
                : row.caps.can_export;
        return (
          <Checkbox
            checked={checked}
            disabled={na || savingKey === `${role}:${row.menu}` || profile?.role !== "admin"}
            onChange={() => toggle(row.menu, action, row.caps)}
            aria-label={`${row.label} ${action}`}
          />
        );
      },
    })),
    {
      title: "",
      key: "reset",
      width: 120,
      render: (_: unknown, row: MatrixRow) =>
        row.isOverride ? (
          <Button
            size="small"
            disabled={savingKey === `${role}:${row.menu}` || profile?.role !== "admin"}
            onClick={() => void saveCaps(row.menu, row.defaults)}
          >
            Reset
          </Button>
        ) : null,
    },
  ];

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Access Matrix</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Menu-level View / Create / Edit / Export. Field-group and RLS rules still apply on top of Edit/Create.
          </Typography.Paragraph>
        </div>
      </div>

      {!enabled ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Menu matrix feature flag is off"
          description="Set VITE_FEATURE_MENU_MATRIX=true (default) and rebuild to enforce this matrix."
        />
      ) : null}

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <span>Role</span>
          <Select
            style={{ minWidth: 200 }}
            value={role}
            options={ROLE_OPTIONS.map((value) => ({
              value,
              label: ROLE_LABELS[value] ?? value,
            }))}
            onChange={(value) => setRole(value)}
          />
          <Button onClick={() => void refresh()} loading={overridesLoading}>
            Refresh
          </Button>
        </Space>

        {overridesLoading ? (
          <div className="page-loading">
            <Spin />
          </div>
        ) : (
          <Table
            size="small"
            rowKey="key"
            columns={columns}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 720 }}
          />
        )}
      </Card>
    </AppShell>
  );
}
