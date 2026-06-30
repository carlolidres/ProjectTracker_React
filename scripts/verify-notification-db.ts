import assert from "node:assert/strict";
import { chunkValues } from "../src/lib/notificationRefresh";
import {
  isExpirableNotificationSeverity,
  isNotificationOlderThanRetention,
  isRetainedNotificationSeverity,
  shouldPersistNotificationOnRefresh,
} from "../src/lib/notificationRetention";

assert.equal(isRetainedNotificationSeverity("critical"), true);
assert.equal(isRetainedNotificationSeverity("high"), true);
assert.equal(isRetainedNotificationSeverity("logic"), true);
assert.equal(isExpirableNotificationSeverity("medium"), true);
assert.equal(isExpirableNotificationSeverity("info"), true);
assert.equal(isExpirableNotificationSeverity("critical"), false);

const stored = new Map<string, unknown>([["n-1", { status: "DISMISSED" }]]);

assert.equal(
  shouldPersistNotificationOnRefresh({ status: "OPEN", severity: "medium" }, stored, "n-new"),
  true,
);
assert.equal(
  shouldPersistNotificationOnRefresh({ status: "EXPIRED", severity: "medium" }, stored, "n-old"),
  false,
);
assert.equal(
  shouldPersistNotificationOnRefresh({ status: "DISMISSED", severity: "high" }, stored, "n-1"),
  true,
);

assert.equal(isNotificationOlderThanRetention(new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()), true);
assert.equal(isNotificationOlderThanRetention(new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()), false);

const ids = Array.from({ length: 250 }, (_, index) => `id-${index}`);
const chunks = chunkValues(ids, 100);
assert.equal(chunks.length, 3);
assert.equal(chunks[0]?.length, 100);
assert.equal(chunks[2]?.length, 50);

console.log("verify-notification-db: PASS");
