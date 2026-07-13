import { supabase } from "@/lib/supabaseClient";
import { logAuditDiff, logAuditTrail } from "@/services/auditService";
import type { ProjectCnfTrackerLink } from "@/types/cnfTracker";

function mapLink(row: Record<string, unknown>): ProjectCnfTrackerLink {
  return {
    link_id: String(row.link_id ?? ""),
    cnf_tracker_record_id: String(row.cnf_tracker_record_id ?? ""),
    project_id: String(row.project_id ?? ""),
    created_by: String(row.created_by ?? ""),
    updated_by: String(row.updated_by ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function listLinksByTrackerRecordId(
  cnfTrackerRecordId: string,
): Promise<ProjectCnfTrackerLink[]> {
  const { data, error } = await supabase
    .from("project_cnf_tracker_links")
    .select("*")
    .eq("cnf_tracker_record_id", cnfTrackerRecordId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapLink);
}

export async function listLinksByProjectId(projectId: string): Promise<ProjectCnfTrackerLink[]> {
  const { data, error } = await supabase
    .from("project_cnf_tracker_links")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapLink);
}

export async function findLink(
  cnfTrackerRecordId: string,
  projectId: string,
): Promise<ProjectCnfTrackerLink | null> {
  const { data, error } = await supabase
    .from("project_cnf_tracker_links")
    .select("*")
    .eq("cnf_tracker_record_id", cnfTrackerRecordId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapLink(data) : null;
}

export async function upsertProjectCnfTrackerLink(
  cnfTrackerRecordId: string,
  projectId: string,
  userEmail: string,
  options?: { actionLabel?: string },
): Promise<ProjectCnfTrackerLink> {
  const existing = await findLink(cnfTrackerRecordId, projectId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_cnf_tracker_links")
    .insert({
      cnf_tracker_record_id: cnfTrackerRecordId,
      project_id: projectId,
      created_by: userEmail,
      updated_by: userEmail,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const again = await findLink(cnfTrackerRecordId, projectId);
      if (again) return again;
    }
    throw error;
  }

  await logAuditTrail({
    module: "Projects",
    action: "CNF_LINK",
    recordId: String(data.link_id),
    projectId,
    fieldName: "cnf_tracker_record_id",
    oldValue: "",
    newValue: cnfTrackerRecordId,
    remarks: options?.actionLabel ?? "CNF linked to project",
    userEmail,
  });

  return mapLink(data);
}

export async function listProjectIdsForTrackerRecord(
  cnfTrackerRecordId: string,
): Promise<string[]> {
  const links = await listLinksByTrackerRecordId(cnfTrackerRecordId);
  return links.map((link) => link.project_id).filter(Boolean);
}

export async function listTrackerRecordIdsForProject(
  projectId: string,
): Promise<string[]> {
  const links = await listLinksByProjectId(projectId);
  return links.map((link) => link.cnf_tracker_record_id).filter(Boolean);
}

/**
 * Project → CNF Tracker sync for linked records only.
 * Does not write Project fields from Tracker (avoids update loops).
 */
export async function syncLinkedTrackersFromProject(
  projectId: string,
  snapshot: {
    product_name: string;
    client_name: string;
    qrmr_no: string;
    change_description: string;
    unique_batch_no?: string;
  },
  userEmail: string,
): Promise<number> {
  const trackerIds = await listTrackerRecordIdsForProject(projectId);
  if (!trackerIds.length) return 0;

  const now = new Date().toISOString();
  let updated = 0;

  for (const recordId of trackerIds) {
    const { data: existing, error: fetchError } = await supabase
      .from("cnf_tracker_records")
      .select("*")
      .eq("record_id", recordId)
      .eq("is_active", true)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) continue;

    const patch = {
      product_name: snapshot.product_name,
      client_name: snapshot.client_name,
      qrmr_no: snapshot.qrmr_no,
      change_description: snapshot.change_description,
      unique_batch_no: snapshot.unique_batch_no ?? existing.unique_batch_no ?? "N/A",
      updated_by: userEmail,
      updated_at: now,
    };

    const { error } = await supabase
      .from("cnf_tracker_records")
      .update(patch)
      .eq("record_id", recordId);
    if (error) throw error;

    await logAuditDiff(
      "CNF Tracker",
      "SYNC_FROM_PROJECT",
      recordId,
      String(existing.cnf_tracker_id ?? projectId),
      {
        product_name: existing.product_name,
        client_name: existing.client_name,
        qrmr_no: existing.qrmr_no,
        change_description: existing.change_description,
        unique_batch_no: existing.unique_batch_no,
      },
      patch,
      userEmail,
    );
    updated += 1;
  }

  return updated;
}
