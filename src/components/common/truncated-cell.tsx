import { Tooltip, Typography } from "antd";

interface TruncatedCellProps {
  value: string;
  maxWidth?: number;
  className?: string;
}

export function TruncatedCell({ value, maxWidth = 200, className }: TruncatedCellProps) {
  const display = value || "N/A";
  if (display === "N/A") {
    return <Typography.Text type="secondary">N/A</Typography.Text>;
  }

  return (
    <Tooltip title={display} placement="topLeft">
      <Typography.Text
        className={className}
        ellipsis
        style={{ maxWidth, display: "inline-block", verticalAlign: "bottom" }}
        aria-label={display}
      >
        {display}
      </Typography.Text>
    </Tooltip>
  );
}
