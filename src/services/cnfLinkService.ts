import {
  applyCnfEntriesToProject,
  cnfEntriesEqual,
  collectCnfReferences,
  getCanonicalCnfEntries,
  validateUnlinkedCnfReferences,
} from "@/lib/cnfMotherLink";
import { isOpenFinalStatus, valueOrNA } from "@/lib/utils";
import { flattenProjectPayload, getProjectById } from "@/services/projectService";
import { logAuditTrail } from "@/services/auditService";
import { mapProjectToDb } from "@/lib/mappers";
import { supabase } from "@/lib/supabaseClient";
import type {
  ProjectCnfMotherLink,
  ProjectHierarchy,
  ProjectRow,
  ProjectSummaryForCnfCopy,
} from "@/types";

interface ProjectCnfLinkRow {
  child_project_id: string;
  mother_project_id: string;
  link_status: "linked" | "unlinked";
  mother_cnf_references: string[] | null;
  copied_entry_count: number;
  linked_at: string;
  linked_by: string | null;
  unlinked_at: string | null;
  unlinked_by: string | null;
}

function mapLinkRow(row: ProjectCnfLinkRow): ProjectCnfMotherLink {
  return {
    child_project_id: row.child_project_id,
    mother_project_id: row.mother_project_id,
    link_status: row.link_status,
    mother_cnf_references: Array.isArray(row.mother_cnf_references) ? row.mother_cnf_references : [],
    copied_entry_count: row.copied_entry_count,
    linked_at: row.linked_at,
    linked_by: row.linked_by ?? undefined,
    unlinked_at: row.unlinked_at ?? undefined,
    unlinked_by: row.unlinked_by ?? undefined,
  };
}

export async function getProjectCnfLink(childProjectId: string): Promise<ProjectCnfMotherLink | null> {
  const { data, error } = await supabase
    .from("project_cnf_links")
    .select("*")
    .eq("child_project_id", childProjectId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapLinkRow(data as ProjectCnfLinkRow) : null;
}

export async function listEligibleMotherProjectSummaries(
  excludeProjectId: string,
): Promise<ProjectSummaryForCnfCopy[]> {
  const { data, error } = await supabase
    .from("cnf_projects")
    .select("project_id, project_owner, client_name, product_name, fg_code, activity_type, final_status, is_active")
    .eq("is_active", true);
  if (error) throw error;

  const byProject = new Map<string, ProjectSummaryForCnfCopy>();
  for (const row of data ?? []) {
    const projectId = String(row.project_id ?? "");
    if (!projectId || projectId === excludeProjectId) continue;
    const finalStatus = valueOrNA(row.final_status);
    if (!isOpenFinalStatus(finalStatus)) continue;
    if (!byProject.has(projectId)) {
      byProject.set(projectId, {
        project_id: projectId,
        project_owner: String(row.project_owner ?? ""),
        client_name: String(row.client_name ?? ""),
        product_name: String(row.product_name ?? ""),
        fg_code: String(row.fg_code ?? ""),
        activity_type: String(row.activity_type ?? ""),
        final_status: finalStatus,
      });
    }
  }
  return [...byProject.values()].sort((a, b) => a.project_id.localeCompare(b.project_id));
}

async function listAllLinks(): Promise<ProjectCnfMotherLink[]> {
  const { data, error } = await supabase.from("project_cnf_links").select("*");
  if (error) throw error;
  return (data ?? []).map((row) => mapLinkRow(row as ProjectCnfLinkRow));
}

function getMotherAncestors(motherId: string, links: ProjectCnfMotherLink[]): Set<string> {
  const ancestors = new Set<string>();
  let current: string | undefined = motherId;
  const byChild = new Map(links.map((link) => [link.child_project_id, link]));
  while (current) {
    const link = byChild.get(current);
    if (!link || link.link_status !== "linked") break;
    ancestors.add(link.mother_project_id);
    current = link.mother_project_id;
  }
  return ancestors;
}

function getChildDescendants(childId: string, links: ProjectCnfMotherLink[]): Set<string> {
  const descendants = new Set<string>();
  const queue = [childId];
  const byMother = new Map<string, ProjectCnfMotherLink[]>();
  for (const link of links) {
    if (link.link_status !== "linked") continue;
    const list = byMother.get(link.mother_project_id) ?? [];
    list.push(link);
    byMother.set(link.mother_project_id, list);
  }
  while (queue.length) {
    const current = queue.shift()!;
    const children = byMother.get(current) ?? [];
    for (const child of children) {
      if (descendants.has(child.child_project_id)) continue;
      descendants.add(child.child_project_id);
      queue.push(child.child_project_id);
    }
  }
  return descendants;
}

export async function assertValidMotherProjectLink(childProjectId: string, motherProjectId: string) {
  if (!childProjectId || !motherProjectId) throw new Error("Both child and mother project IDs are required.");
  if (childProjectId === motherProjectId) throw new Error("A project cannot copy CNF entries from itself.");

  const mother = await getProjectById(motherProjectId);
  if (!mother) throw new Error("Selected mother project is not active or does not exist.");

  const motherRows = await supabase
    .from("cnf_projects")
    .select("final_status, is_active")
    .eq("project_id", motherProjectId)
    .eq("is_active", true)
    .limit(1);
  if (motherRows.error) throw motherRows.error;
  if (!motherRows.data?.length) throw new Error("Selected mother project is archived or inactive.");

  const finalStatus = valueOrNA((motherRows.data[0] as ProjectRow).final_status);
  if (!isOpenFinalStatus(finalStatus)) {
    throw new Error("Closed or cancelled projects cannot be used as a mother project.");
  }

  const links = await listAllLinks();
  const ancestors = getMotherAncestors(motherProjectId, links);
  if (ancestors.has(childProjectId)) {
    throw new Error("Circular CNF linking is not allowed. This would create a dependency loop.");
  }
  const descendants = getChildDescendants(childProjectId, links);
  if (descendants.has(motherProjectId)) {
    throw new Error("Circular CNF linking is not allowed. The selected project already depends on this child.");
  }
}

async function persistChildCnfEntries(
  childProjectId: string,
  project: ProjectHierarchy,
  userEmail: string,
): Promise<void> {
  const lines = flattenProjectPayload(project, childProjectId);
  const now = new Date().toISOString();
  for (const line of lines) {
    const recordId = line.record_id as string | undefined;
    if (!recordId) continue;
    const { error } = await supabase
      .from("cnf_projects")
      .update(
        mapProjectToDb({
          cnf_reference: line.cnf_reference,
          qrmr_ref_no: line.qrmr_ref_no,
          change_description: line.change_description,
          cnf_status: line.cnf_status,
          client_approval_target_date: line.client_approval_target_date,
          remarks: line.remarks,
          cnf_entries_json: line.cnf_entries_json,
          updated_by: userEmail,
          updated_at: now,
        }),
      )
      .eq("record_id", recordId);
    if (error) throw error;
  }
}

export async function copyAndLinkCnfFromMother(
  childProject: ProjectHierarchy,
  motherProjectId: string,
  userEmail: string,
): Promise<{ project: ProjectHierarchy; link: ProjectCnfMotherLink }> {
  const childProjectId = childProject.project_id;
  await assertValidMotherProjectLink(childProjectId, motherProjectId);

  const mother = await getProjectById(motherProjectId);
  if (!mother) throw new Error("Mother project could not be loaded.");

  const motherEntries = getCanonicalCnfEntries(mother);
  const copiedCount = motherEntries.length;
  const motherRefs = collectCnfReferences(mother);
  const nextProject = applyCnfEntriesToProject(childProject, motherEntries);

  const now = new Date().toISOString();
  const linkPayload = {
    child_project_id: childProjectId,
    mother_project_id: motherProjectId,
    link_status: "linked" as const,
    mother_cnf_references: motherRefs,
    copied_entry_count: copiedCount,
    linked_at: now,
    linked_by: userEmail,
    unlinked_at: null,
    unlinked_by: null,
    updated_at: now,
  };

  const { error: linkError } = await supabase.from("project_cnf_links").upsert(linkPayload);
  if (linkError) throw linkError;

  await persistChildCnfEntries(childProjectId, nextProject, userEmail);

  const link = mapLinkRow(linkPayload as ProjectCnfLinkRow);
  nextProject.cnf_mother_link = link;

  await logAuditTrail({
    module: "Projects",
    action: "UPDATE",
    recordId: childProjectId,
    projectId: childProjectId,
    fieldName: "cnf_mother_link",
    oldValue: "",
    newValue: motherProjectId,
    remarks: `User copied ${copiedCount} CNF ${copiedCount === 1 ? "entry" : "entries"} from Mother Project ${motherProjectId} to Child Project ${childProjectId}. Copied CNF entries were linked and set to read-only.`,
    userEmail,
  });

  return { project: nextProject, link };
}

export async function unlinkChildFromMother(
  childProjectId: string,
  userEmail: string,
): Promise<ProjectCnfMotherLink> {
  const existing = await getProjectCnfLink(childProjectId);
  if (!existing || existing.link_status !== "linked") {
    throw new Error("This project is not linked to a mother project.");
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("project_cnf_links")
    .update({
      link_status: "unlinked",
      unlinked_at: now,
      unlinked_by: userEmail,
      updated_at: now,
    })
    .eq("child_project_id", childProjectId);
  if (error) throw error;

  const link: ProjectCnfMotherLink = {
    ...existing,
    link_status: "unlinked",
    unlinked_at: now,
    unlinked_by: userEmail,
  };

  await logAuditTrail({
    module: "Projects",
    action: "UPDATE",
    recordId: childProjectId,
    projectId: childProjectId,
    fieldName: "cnf_mother_link",
    oldValue: existing.mother_project_id,
    newValue: "unlinked",
    remarks: `User unlinked Child Project ${childProjectId} from Mother Project ${existing.mother_project_id}. CNF entries became independent and editable. A new unique CNF number is required before saving.`,
    userEmail,
  });

  return link;
}

export async function syncLinkedChildFromMother(
  childProject: ProjectHierarchy,
  link: ProjectCnfMotherLink,
): Promise<ProjectHierarchy> {
  if (link.link_status !== "linked") return childProject;
  const mother = await getProjectById(link.mother_project_id);
  if (!mother) return childProject;
  const synced = applyCnfEntriesToProject(childProject, getCanonicalCnfEntries(mother));
  synced.cnf_mother_link = link;
  return synced;
}

export async function enforceLinkedChildCnfOnSave(
  childProjectId: string,
  payload: ProjectHierarchy,
  link: ProjectCnfMotherLink,
  userEmail: string,
): Promise<ProjectHierarchy> {
  const mother = await getProjectById(link.mother_project_id);
  if (!mother) return payload;
  const motherEntries = getCanonicalCnfEntries(mother);
  const childEntries = getCanonicalCnfEntries(payload);
  if (!cnfEntriesEqual(childEntries, motherEntries)) {
    await logAuditTrail({
      module: "Projects",
      action: "UPDATE",
      recordId: childProjectId,
      projectId: childProjectId,
      fieldName: "cnf_entries_json",
      oldValue: JSON.stringify(childEntries),
      newValue: JSON.stringify(motherEntries),
      remarks: `System blocked editing of linked CNF entries in Child Project ${childProjectId} because the entries are controlled by Mother Project ${link.mother_project_id}.`,
      userEmail,
    });
  }
  const synced = applyCnfEntriesToProject(payload, motherEntries);
  synced.cnf_mother_link = link;
  return synced;
}

export async function propagateMotherCnfToLinkedChildren(
  motherProjectId: string,
  motherProject: ProjectHierarchy,
  userEmail: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("project_cnf_links")
    .select("child_project_id")
    .eq("mother_project_id", motherProjectId)
    .eq("link_status", "linked");
  if (error) throw error;
  if (!data?.length) return;

  const motherEntries = getCanonicalCnfEntries(motherProject);
  for (const row of data) {
    const childId = String(row.child_project_id);
    const child = await getProjectById(childId);
    if (!child) continue;
    const synced = applyCnfEntriesToProject(child, motherEntries);
    await persistChildCnfEntries(childId, synced, userEmail);
    await logAuditTrail({
      module: "Projects",
      action: "UPDATE",
      recordId: childId,
      projectId: childId,
      fieldName: "cnf_entries_json",
      oldValue: "",
      newValue: JSON.stringify(motherEntries),
      remarks: `Mother Project ${motherProjectId} CNF entries were propagated to linked Child Project ${childId}.`,
      userEmail,
    });
  }
}

export async function validateChildProjectCnfSave(
  projectId: string,
  payload: ProjectHierarchy,
  link: ProjectCnfMotherLink | null | undefined,
  userEmail: string,
): Promise<void> {
  const reuseError = validateUnlinkedCnfReferences(payload, link ?? undefined);
  if (reuseError) {
    await logAuditTrail({
      module: "Projects",
      action: "UPDATE",
      recordId: projectId,
      projectId,
      fieldName: "cnf_reference",
      oldValue: "",
      newValue: collectCnfReferences(payload).join(", "),
      remarks: `System blocked saving because Child Project ${projectId} attempted to reuse a CNF number from Mother Project ${link?.mother_project_id ?? "unknown"} after unlinking.`,
      userEmail,
    });
    throw new Error(reuseError);
  }

  if (link?.link_status !== "unlinked") return;
  for (const ref of collectCnfReferences(payload)) {
    const duplicate = await findGlobalCnfReferenceOwner(ref, projectId);
    if (duplicate) {
      throw new Error(`CNF number ${ref} is already used by project ${duplicate}. Assign a unique CNF number before saving.`);
    }
  }
}

async function findGlobalCnfReferenceOwner(cnfReference: string, excludeProjectId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("cnf_projects")
    .select("project_id, cnf_reference, cnf_entries_json")
    .eq("is_active", true)
    .neq("project_id", excludeProjectId);
  if (error) throw error;

  for (const row of data ?? []) {
    const projectId = String(row.project_id ?? "");
    if (valueOrNA(row.cnf_reference) === cnfReference) return projectId;
    try {
      const parsed = JSON.parse(String(row.cnf_entries_json ?? "[]")) as Array<{ cnf_reference?: string }>;
      if (parsed.some((entry) => valueOrNA(entry.cnf_reference) === cnfReference)) return projectId;
    } catch {
      // ignore malformed json
    }
  }
  return null;
}

export async function attachCnfLinkToProject(project: ProjectHierarchy): Promise<ProjectHierarchy> {
  const link = await getProjectCnfLink(project.project_id);
  if (!link) return project;
  if (link.link_status === "linked") {
    return syncLinkedChildFromMother(project, link);
  }
  return { ...project, cnf_mother_link: link };
}

export async function logBlockedLinkedCnfEdit(
  childProjectId: string,
  motherProjectId: string,
  userEmail: string,
): Promise<void> {
  await logAuditTrail({
    module: "Projects",
    action: "UPDATE",
    recordId: childProjectId,
    projectId: childProjectId,
    fieldName: "cnf_entries_json",
    oldValue: "",
    newValue: "",
    remarks: `System blocked editing of linked CNF entries in Child Project ${childProjectId} because the entries are controlled by Mother Project ${motherProjectId}.`,
    userEmail,
  });
}

export async function logBlockedLinkedCnfNumberChange(
  childProjectId: string,
  motherProjectId: string,
  userEmail: string,
): Promise<void> {
  await logAuditTrail({
    module: "Projects",
    action: "UPDATE",
    recordId: childProjectId,
    projectId: childProjectId,
    fieldName: "cnf_reference",
    oldValue: "",
    newValue: "",
    remarks: `System blocked CNF number change in Child Project ${childProjectId} because the CNF entries are still linked to Mother Project ${motherProjectId}.`,
    userEmail,
  });
}
