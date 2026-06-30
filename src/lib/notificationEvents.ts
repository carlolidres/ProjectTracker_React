export const NOTIFICATIONS_REFRESHED_EVENT = "notifications-refreshed";

export function emitNotificationsRefreshed(): void {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESHED_EVENT));
}

export function subscribeNotificationsRefreshed(listener: () => void): () => void {
  window.addEventListener(NOTIFICATIONS_REFRESHED_EVENT, listener);
  return () => window.removeEventListener(NOTIFICATIONS_REFRESHED_EVENT, listener);
}
