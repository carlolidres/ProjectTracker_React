export const LOGIC_VIOLATION_EVENT = "project-tracker-logic-violation";

export interface LogicViolationEventDetail {
  message: string;
  projectId?: string;
}

export function emitLogicViolation(detail: LogicViolationEventDetail) {
  window.dispatchEvent(new CustomEvent(LOGIC_VIOLATION_EVENT, { detail }));
}

export function isLogicViolationError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("so no.") ||
    lower.includes("po control") ||
    lower.includes("duplicate so") ||
    lower.includes("duplicate po") ||
    lower.includes("unique") ||
    lower.includes("critical:") ||
    lower.includes("already exists")
  );
}

export function vibrateNotificationAlert() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([100, 50, 100, 50, 100]);
  }
}
