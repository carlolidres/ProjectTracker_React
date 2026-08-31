import { supabase } from "@/lib/supabaseClient";
import { shortenChangeDescription } from "@/lib/changeDescriptionSummary";

export interface ChangeSummaryRequestItem {
  id: string;
  text: string;
}

export async function summarizeChangeDescriptions(
  items: ChangeSummaryRequestItem[],
): Promise<Record<string, string>> {
  const payload = items
    .filter((item) => item.text.trim())
    .slice(0, 40)
    .map((item) => ({
      id: item.id,
      text: item.text.trim().slice(0, 1200),
    }));
  if (payload.length === 0) return {};

  const { data, error } = await supabase.functions.invoke("summarize-change", {
    body: { items: payload },
  });
  if (error) return {};

  const rows = (data as { summaries?: Array<{ id?: string; summary?: string }> } | null)?.summaries;
  if (!Array.isArray(rows)) return {};

  const next: Record<string, string> = {};
  for (const row of rows) {
    const id = String(row.id ?? "").trim();
    const summary = shortenChangeDescription(String(row.summary ?? "").trim());
    if (!id || !summary) continue;
    next[id] = summary;
  }
  return next;
}
