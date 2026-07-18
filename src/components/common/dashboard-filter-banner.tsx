import { Button, Space, Tag, Typography } from "antd";

interface DashboardFilterBannerProps {
  labels: string[];
  onClear: () => void;
  title?: string;
}

export function DashboardFilterBanner({
  labels,
  onClear,
  title = "Filtered from Dashboard",
}: DashboardFilterBannerProps) {
  if (!labels.length) return null;
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
        <Typography.Text strong style={{ marginRight: 4 }}>
          {title}:
        </Typography.Text>
        {labels.map((label) => (
          <Tag key={label} color="blue">
            {label}
          </Tag>
        ))}
      </Space>
      <Button size="small" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
