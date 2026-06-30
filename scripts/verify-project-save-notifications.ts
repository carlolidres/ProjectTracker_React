import assert from "node:assert/strict";
import { runWithRetry, toNotificationDbRow } from "../src/lib/notificationRefresh";
import type { Notification } from "../src/types";

const sample: Notification = {
  notification_id: "n-1",
  project_id: "PROJ-1",
  record_id: "REC-1",
  fg_month: "2026-06",
  severity: "logic",
  title: "Logic issue",
  message: "Duplicate PO",
  status: "OPEN",
  created_at: new Date().toISOString(),
  kind: "logic_violation_critical",
};

const dbRow = toNotificationDbRow(sample);
assert.equal("kind" in dbRow, false);
assert.equal(dbRow.notification_id, "n-1");

let attempts = 0;
const successOnSecond = await runWithRetry(
  async () => {
    attempts += 1;
    if (attempts < 2) {
      throw new Error("temporary");
    }
    return "ok";
  },
  { maxAttempts: 2, delayMs: 1 },
);
assert.equal(successOnSecond, "ok");
assert.equal(attempts, 2);

let failAttempts = 0;
await assert.rejects(
  () =>
    runWithRetry(
      async () => {
        failAttempts += 1;
        throw new Error("persistent");
      },
      { maxAttempts: 2, delayMs: 1 },
    ),
  /persistent/,
);
assert.equal(failAttempts, 2);

console.log("verify-project-save-notifications: PASS");
