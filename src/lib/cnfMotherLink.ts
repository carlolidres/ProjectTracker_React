import { NA_VALUE } from "@/lib/constants";
import { emptyCnfEntry, syncProjectCnfEntryCounts } from "@/lib/projectHierarchy";
import type { CnfEntry, ProjectCnfMotherLink, ProjectHierarchy } from "@/types";
import { valueOrNA } from "@/lib/utils";

export const UNLINKED_CNF_REUSE_MESSAGE =
  "This CNF number came from the Mother Project and cannot be reused after unlinking. Please assign a new unique CNF number before saving.";

export function getCanonicalPo(project: ProjectHierarchy) {
  return project.batches[0]?.mo_controls[0]?.po_controls[0];
}

export function getCanonicalCnfEntries(project: ProjectHierarchy): CnfEntry[] {
  const po = getCanonicalPo(project);
  if (!po?.cnf_entries?.length) return [emptyCnfEntry()];
  return structuredClone(po.cnf_entries);
}

export function collectCnfReferences(project: ProjectHierarchy): string[] {
  const refs = new Set<string>();
  for (const entry of getCanonicalCnfEntries(project)) {
    const ref = valueOrNA(entry.cnf_reference);
    if (ref !== NA_VALUE && ref.trim()) refs.add(ref);
  }
  return [...refs];
}

export function applyCnfEntriesToProject(project: ProjectHierarchy, entries: CnfEntry[]): ProjectHierarchy {
  const next = structuredClone(project);
  const canonicalPo = next.batches[0]?.mo_controls[0]?.po_controls[0];
  if (!canonicalPo) return next;
  canonicalPo.cnf_entries = structuredClone(entries);
  const first = canonicalPo.cnf_entries[0] ?? emptyCnfEntry();
  canonicalPo.cnf_reference = first.cnf_reference;
  canonicalPo.qrmr_ref_no = first.qrmr_ref_no;
  canonicalPo.change_description = first.change_description;
  canonicalPo.cnf_status = first.cnf_status;
  canonicalPo.client_approval_target_date = first.client_approval_target_date;
  canonicalPo.remarks = first.remarks;
  syncProjectCnfEntryCounts(next);
  return next;
}

export function cnfEntriesEqual(a: CnfEntry[], b: CnfEntry[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function isCnfMotherLinked(link?: ProjectCnfMotherLink): boolean {
  return link?.link_status === "linked" && Boolean(link.mother_project_id);
}

export function isCnfMotherUnlinked(link?: ProjectCnfMotherLink): boolean {
  return link?.link_status === "unlinked" && Boolean(link.mother_project_id);
}

export function validateUnlinkedCnfReferences(
  project: ProjectHierarchy,
  link?: ProjectCnfMotherLink,
): string | null {
  if (!isCnfMotherUnlinked(link)) return null;
  const blocked = new Set(
    (link?.mother_cnf_references ?? [])
      .map((ref) => valueOrNA(ref))
      .filter((ref) => ref !== NA_VALUE && ref.trim()),
  );
  if (!blocked.size) return null;

  for (const entry of getCanonicalCnfEntries(project)) {
    const ref = valueOrNA(entry.cnf_reference);
    if (blocked.has(ref)) return UNLINKED_CNF_REUSE_MESSAGE;
  }
  return null;
}

export function motherProjectUrl(motherProjectId: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${normalized}#/projects?projectId=${encodeURIComponent(motherProjectId)}`;
}
