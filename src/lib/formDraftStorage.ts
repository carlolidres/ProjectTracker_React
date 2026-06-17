import { useEffect } from "react";
import type { ProjectTab } from "@/lib/projectFormFields";
import type { ProjectHierarchy, SupportActivity } from "@/types";
import type { CnfTrackerStatus } from "@/types/cnfTracker";

const DRAFT_PREFIX = "project-tracker:draft:";

export interface ProjectEntryDraft {
  project: ProjectHierarchy;
  openKeys: string[];
  activeTab: ProjectTab;
  projectIdParam: string | null;
  savedFgMonths: Record<string, string>;
}

export interface CnfTrackerFormDraft {
  cnf_tracker_id: string;
  cnf_reference: string;
  cnf_initiator: string;
  tracker_status: CnfTrackerStatus;
}

export interface CnfTrackerDraft {
  form: CnfTrackerFormDraft;
  initiatorTouched: boolean;
  trackerIdParam: string | null;
}

function draftKey(userId: string, formKey: string): string {
  return `${DRAFT_PREFIX}${userId}:${formKey}`;
}

function parseProjectEntryDraft(raw: string): ProjectEntryDraft | null {
  try {
    const parsed = JSON.parse(raw) as ProjectEntryDraft | ProjectHierarchy;
    if (parsed && typeof parsed === "object" && "project" in parsed) {
      const draft = parsed as Partial<ProjectEntryDraft>;
      return {
        project: draft.project as ProjectHierarchy,
        openKeys: Array.isArray(draft.openKeys) ? draft.openKeys : [],
        activeTab: draft.activeTab ?? "AM/BM/PL",
        projectIdParam: draft.projectIdParam ?? null,
        savedFgMonths:
          draft.savedFgMonths && typeof draft.savedFgMonths === "object"
            ? draft.savedFgMonths
            : {},
      };
    }
    if (parsed && typeof parsed === "object" && "batches" in parsed) {
      return {
        project: parsed as ProjectHierarchy,
        openKeys: [],
        activeTab: "AM/BM/PL",
        projectIdParam: null,
        savedFgMonths: {},
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveProjectEntryDraft(userId: string, draft: ProjectEntryDraft): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(draftKey(userId, "projects-entry"), JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

export function loadProjectEntryDraft(userId: string): ProjectEntryDraft | null {
  if (typeof window === "undefined" || !userId) return null;
  const raw = localStorage.getItem(draftKey(userId, "projects-entry"));
  if (!raw) return null;
  return parseProjectEntryDraft(raw);
}

export function clearProjectEntryDraft(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  localStorage.removeItem(draftKey(userId, "projects-entry"));
}

export function saveSupportActivityDraft(userId: string, form: Partial<SupportActivity>): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(draftKey(userId, "support-activities"), JSON.stringify(form));
  } catch {
    // ignore quota errors
  }
}

export function loadSupportActivityDraft(userId: string): Partial<SupportActivity> | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(draftKey(userId, "support-activities"));
    if (!raw) return null;
    return JSON.parse(raw) as Partial<SupportActivity>;
  } catch {
    return null;
  }
}

export function clearSupportActivityDraft(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  localStorage.removeItem(draftKey(userId, "support-activities"));
}

function parseCnfTrackerDraft(raw: string): CnfTrackerDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<CnfTrackerDraft>;
    if (!parsed?.form || typeof parsed.form !== "object") return null;
    const form = parsed.form;
    return {
      form: {
        cnf_tracker_id: String(form.cnf_tracker_id ?? "N/A"),
        cnf_reference: String(form.cnf_reference ?? ""),
        cnf_initiator: String(form.cnf_initiator ?? "N/A"),
        tracker_status: form.tracker_status === "Closed" ? "Closed" : "Open",
      },
      initiatorTouched: Boolean(parsed.initiatorTouched),
      trackerIdParam: parsed.trackerIdParam ?? null,
    };
  } catch {
    return null;
  }
}

export function saveCnfTrackerDraft(userId: string, draft: CnfTrackerDraft): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(draftKey(userId, "cnf-tracker"), JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

export function loadCnfTrackerDraft(userId: string): CnfTrackerDraft | null {
  if (typeof window === "undefined" || !userId) return null;
  const raw = localStorage.getItem(draftKey(userId, "cnf-tracker"));
  if (!raw) return null;
  return parseCnfTrackerDraft(raw);
}

export function clearCnfTrackerDraft(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  localStorage.removeItem(draftKey(userId, "cnf-tracker"));
}

export function clearAllFormDraftsForUser(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  clearProjectEntryDraft(userId);
  clearSupportActivityDraft(userId);
  clearCnfTrackerDraft(userId);
}

export function clearAllFormDrafts(): void {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(DRAFT_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

/**
 * Synchronously flush draft data when the page is hidden (e.g. window minimize).
 * Browsers may discard/reload minimized tabs before debounced saves run.
 */
export function useFlushOnPageHide(flush: () => void): void {
  useEffect(() => {
    const run = () => flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") run();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", run);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", run);
    };
  }, [flush]);
}

/** Debounced draft save that flushes synchronously on unmount or dependency change. */
export function useDebouncedDraftPersist(
  persist: () => void,
  enabled: boolean,
  debounceMs = 400,
  shouldFlushOnCleanup: () => boolean = () => true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => {
      persist();
    }, debounceMs);
    return () => {
      window.clearTimeout(timer);
      if (shouldFlushOnCleanup()) persist();
    };
  }, [persist, enabled, debounceMs, shouldFlushOnCleanup]);
}
