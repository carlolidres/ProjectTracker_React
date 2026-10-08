const HANDOFF_KEY = "project-tracker:board-session-handoff";

function supabaseAuthEntries(): Record<string, string> {
  const payload: Record<string, string> = {};
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (!key?.startsWith("sb-")) continue;
    const value = sessionStorage.getItem(key);
    if (value) payload[key] = value;
  }
  return payload;
}

export const BOARD_WINDOW_NAME = "project-tracker-board";

/** Copies this tab's sign-in so the board window can adopt it before the client starts. */
export function stageBoardSessionHandoff(fallback?: { key: string; value: string } | null): void {
  const payload = supabaseAuthEntries();
  if (fallback?.key.startsWith("sb-") && fallback.value && !payload[fallback.key]) {
    payload[fallback.key] = fallback.value;
  }
  if (Object.keys(payload).length === 0) return;
  localStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
}

/** Moves a staged sign-in into the board window. The opener must not consume it. */
export function adoptBoardSessionHandoff(): void {
  if (typeof window === "undefined" || window.name !== BOARD_WINDOW_NAME) return;
  const raw = localStorage.getItem(HANDOFF_KEY);
  if (!raw) return;
  localStorage.removeItem(HANDOFF_KEY);
  try {
    const payload = JSON.parse(raw) as Record<string, string>;
    for (const [key, value] of Object.entries(payload)) {
      if (!key.startsWith("sb-") || typeof value !== "string") continue;
      sessionStorage.setItem(key, value);
    }
  } catch {
    localStorage.removeItem(HANDOFF_KEY);
  }
}

export function clearBoardSessionHandoff(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HANDOFF_KEY);
}
