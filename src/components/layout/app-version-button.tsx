import { Button, Drawer, Typography } from "antd";
import { useState } from "react";
import { getAppGitSha, getAppVersion, getAppVersionLabel } from "@/lib/appVersion";

/** Lucide `Info` icon (MIT) — single glyph, no lucide-react dependency. */
function LucideInfoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function AppVersionButton() {
  const [open, setOpen] = useState(false);
  const version = getAppVersion();
  const sha = getAppGitSha();
  const label = getAppVersionLabel();

  return (
    <>
      <Button
        type="text"
        icon={<LucideInfoIcon />}
        aria-label={`Application version ${label}`}
        title="About / version"
        onClick={() => setOpen(true)}
      />
      <Drawer
        title="About Project Tracker"
        placement="right"
        width={360}
        open={open}
        onClose={() => setOpen(false)}
      >
        <div className="app-version-panel">
          <Typography.Paragraph style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary">Version</Typography.Text>
            <br />
            <Typography.Text code style={{ fontSize: 15 }}>
              {label}
            </Typography.Text>
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 8 }}>
            <Typography.Text type="secondary">Package</Typography.Text>
            <br />
            <Typography.Text>{version}</Typography.Text>
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary">Git commit</Typography.Text>
            <br />
            <Typography.Text code>{sha || "local"}</Typography.Text>
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
            This identity matches the GitHub Pages build for the current deployment.
          </Typography.Paragraph>
        </div>
      </Drawer>
    </>
  );
}
