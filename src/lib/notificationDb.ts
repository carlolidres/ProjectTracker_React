import {
  chunkValues,
  NOTIFICATION_DB_BATCH_SIZE,
  type NotificationDbRow,
} from "@/lib/notificationRefresh";
import { supabase } from "@/lib/supabaseClient";
import { NOTIFICATION_RETENTION_MS } from "@/lib/notificationRetention";

type NotificationDbRowCore = Omit<NotificationDbRow, "dismissed_at" | "resolved_at">;

function isMissingOptionalNotificationColumnError(error: unknown): boolean {
  const message = error && typeof error === "object" && "message" in error
    ? String((error as { message: unknown }).message)
    : "";
  return /dismissed_at|resolved_at|column/i.test(message);
}

export async function deleteNotificationIds(
  notificationIds: string[],
  batchSize = NOTIFICATION_DB_BATCH_SIZE,
): Promise<void> {
  for (const chunk of chunkValues(notificationIds, batchSize)) {
    const { error } = await supabase.from("notifications").delete().in("notification_id", chunk);
    if (error) throw error;
  }
}

export async function upsertNotificationRows(rows: NotificationDbRow[]): Promise<void> {
  if (!rows.length) return;

  for (const chunk of chunkValues(rows)) {
    const { error } = await supabase
      .from("notifications")
      .upsert(chunk, { onConflict: "notification_id" });

    if (error && isMissingOptionalNotificationColumnError(error)) {
      const minimal: NotificationDbRowCore[] = chunk.map(
        ({ dismissed_at: _dismissedAt, resolved_at: _resolvedAt, ...core }) => core,
      );
      const { error: retryError } = await supabase
        .from("notifications")
        .upsert(minimal, { onConflict: "notification_id" });
      if (retryError) throw retryError;
      continue;
    }

    if (error) throw error;
  }
}

/** Remove low/medium/info notifications after the 24-hour retention window. */
export async function removeExpiredStandardNotifications(): Promise<void> {
  const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_MS).toISOString();

  const { error: expiredError } = await supabase
    .from("notifications")
    .delete()
    .eq("status", "EXPIRED")
    .in("severity", ["low", "medium", "info"]);
  if (expiredError) throw expiredError;

  const { error: staleOpenError } = await supabase
    .from("notifications")
    .delete()
    .eq("status", "OPEN")
    .in("severity", ["low", "medium", "info"])
    .lt("created_at", cutoff);
  if (staleOpenError) throw staleOpenError;
}
