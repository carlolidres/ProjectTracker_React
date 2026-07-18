import { Button, Space, Tag, Typography } from "antd";

interface DashboardFilterBannerProps {
  labels: string[];
  onClear: () => void;
  title?: string;
  /** When set (dashboard workspace), show navigation back to the hub. */
  onBackToDashboard?: () => void;
}

export function DashboardFilterBanner({
  labels,
  onClear,
  title = "Filtered from Dashboard",
  onBackToDashboard,
}: DashboardFilterBannerProps) {
  if (!labels.length && !onBackToDashboard) return null;
  return (
    <div
      className="dashboard-filter-banner"
      style={{
        marginBottom: 16,
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "color-mix(in srgb, var(--primary) 8%, var(--surface))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <Space wrap size={[6, 6]}>
        {labels.length ? (
          <>
            <Typography.Text strong style={{ marginRight: 4 }}>
              {title}:
            </Typography.Text>
            {labels.map((label) => (
              <Tag key={label} color="blue">
                {label}
              </Tag>
            ))}
          </>
        ) : (
          <Typography.Text type="secondary">Opened from Dashboard</Typography.Text>
        )}
      </Space>
      <Space wrap size={8}>
        {onBackToDashboard ? (
          <Button size="small" type="primary" onClick={onBackToDashboard}>
            Back to Dashboard
          </Button>
        ) : null}
        {labels.length ? (
          <Button size="small" onClick={onClear}>
            Clear filters
          </Button>
        ) : null}
      </Space>
    </div>
  );
}
