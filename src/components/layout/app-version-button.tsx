import { Button, Drawer, Tag, Typography } from "antd";
import { useState } from "react";
import { getAppGitSha, getAppVersion, getAppVersionLabel } from "@/lib/appVersion";
import { getAppVersionHistory } from "@/lib/appVersionHistory";

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
  const history = getAppVersionHistory();

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
        width={400}
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
          <Typography.Paragraph type="secondary" style={{ marginBottom: 20, fontSize: 12 }}>
            This identity matches the GitHub Pages build for the current deployment.
          </Typography.Paragraph>

          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
            Version history
          </Typography.Title>
          <ul className="app-version-history">
            {history.map((entry) => {
              const isCurrent = entry.version === version;
              return (
                <li key={entry.version} className="app-version-history-item">
                  <div className="app-version-history-head">
                    <Typography.Text strong>v{entry.version}</Typography.Text>
                    {isCurrent ? <Tag color="blue">Current</Tag> : null}
                    {entry.date ? (
                      <Typography.Text type="secondary" className="app-version-history-meta">
                        {entry.date}
                      </Typography.Text>
                    ) : null}
                    {entry.sha ? (
                      <Typography.Text code className="app-version-history-sha">
                        {entry.sha}
                      </Typography.Text>
                    ) : null}
                  </div>
                  <Typography.Paragraph className="app-version-history-title">
                    {entry.title}
                  </Typography.Paragraph>
                  <ul className="app-version-history-changes">
                    {entry.changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      </Drawer>
    </>
  );
}
