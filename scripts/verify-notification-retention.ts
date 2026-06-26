import assert from "node:assert/strict";
import { applyNotificationRetention, buildStableNotificationId } from "../src/lib/notificationRetention";
import type { Notification } from "../src/types";

function sampleNotification(severity: string, ageHours: number): Notification {
  return {
    notification_id: buildStableNotificationId("PROJ-2026-001", "REC-1", `${severity} alert`),
    project_id: "PROJ-2026-001",
    record_id: "REC-1",
    fg_month: "2026-06",
    severity,
    title: `${severity} alert`,
    message: "Test message",
    status: "OPEN",
    created_at: new Date(Date.now() - ageHours * 60 * 60 * 1000).toISOString(),
  };
}

const now = Date.now();
const retained = applyNotificationRetention(
  [
    sampleNotification("high", 72),
    sampleNotification("medium", 1),
    sampleNotification("medium", 30),
    sampleNotification("info", 30),
  ],
  now,
);

assert.equal(retained.length, 2);
assert.ok(retained.some((item) => item.severity === "high"));
assert.ok(retained.some((item) => item.severity === "medium" && item.title.includes("medium")));

console.log("verify-notification-retention: PASS");
