import assert from "node:assert/strict";
import {
  applyNotificationRetention,
  buildStableNotificationId,
  filterActiveNotifications,
  filterDisplayedNotifications,
} from "../src/lib/notificationRetention";
import type { Notification } from "../src/types";

function sampleNotification(
  severity: string,
  ageHours: number,
  status = "OPEN",
): Notification {
  return {
    notification_id: buildStableNotificationId("PROJ-2026-001", "REC-1", `${severity} alert`),
    project_id: "PROJ-2026-001",
    record_id: "REC-1",
    fg_month: "2026-06",
    severity,
    title: `${severity} alert`,
    message: "Test message",
    status,
    created_at: new Date(Date.now() - ageHours * 60 * 60 * 1000).toISOString(),
  };
}

const now = Date.now();

// Standard notification less than 24 hours old — kept
const freshMedium = sampleNotification("medium", 1);
assert.equal(applyNotificationRetention([freshMedium], now).length, 1);

// Standard notification more than 24 hours old — expired
const staleMedium = sampleNotification("medium", 30);
assert.equal(applyNotificationRetention([staleMedium], now).length, 0);

// High notification more than 24 hours old — retained
const staleHigh = sampleNotification("high", 72);
assert.equal(applyNotificationRetention([staleHigh], now).length, 1);

// Critical notification more than 24 hours old — retained
const staleCritical = sampleNotification("critical", 96);
assert.equal(applyNotificationRetention([staleCritical], now).length, 1);

// Manually dismissed High notification — hidden from active list
const dismissedHigh = {
  ...sampleNotification("high", 72),
  status: "DISMISSED",
  dismissed_at: new Date().toISOString(),
};
assert.equal(filterActiveNotifications([dismissedHigh], now).length, 0);

// Resolved Critical notification — hidden from active list
const resolvedCritical = {
  ...sampleNotification("critical", 120),
  status: "RESOLVED",
  resolved_at: new Date().toISOString(),
};
assert.equal(filterActiveNotifications([resolvedCritical], now).length, 0);

const active = filterActiveNotifications(
  [
    sampleNotification("high", 72),
    sampleNotification("medium", 1),
    sampleNotification("medium", 30),
    sampleNotification("info", 30),
    dismissedHigh,
    resolvedCritical,
  ],
  now,
);

assert.equal(active.length, 2);
assert.ok(active.some((item) => item.severity === "high"));
assert.ok(active.some((item) => item.severity === "medium" && item.title.includes("medium")));

const displayed = filterDisplayedNotifications(active);
assert.equal(displayed.length, 1);
assert.equal(displayed[0]?.severity, "high");

console.log("verify-notification-retention: PASS");
