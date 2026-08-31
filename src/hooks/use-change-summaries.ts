import { useEffect, useMemo, useState } from "react";
import {
  changeSummaryCacheKey,
  shortenChangeDescription,
} from "@/lib/changeDescriptionSummary";
import { summarizeChangeDescriptions } from "@/services/changeSummaryService";
import type { PortfolioItem } from "@/types";

function readCachedSummary(text: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(changeSummaryCacheKey(text));
  } catch {
    return null;
  }
}

function writeCachedSummary(text: string, summary: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(changeSummaryCacheKey(text), summary);
  } catch {
    // ponytail: sessionStorage can be blocked; local shorten still displays.
  }
}

export function useChangeSummaries(items: PortfolioItem[]): Record<string, string> {
  const signature = useMemo(
    () => items.map((item) => `${item.id}\0${item.changeLabel}`).join("\n"),
    [items],
  );
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});

  useEffect(() => {
    const local: Record<string, string> = {};
    const pending: Array<{ id: string; text: string }> = [];
    for (const item of items) {
      const source = item.changeLabel.trim();
      if (!source || source.toUpperCase() === "N/A") continue;
      const cached = readCachedSummary(source);
      if (cached) {
        local[item.id] = cached;
        continue;
      }
      pending.push({ id: item.id, text: source });
    }
    setAiSummaries(local);
    if (pending.length === 0) return undefined;

    let cancelled = false;
    void summarizeChangeDescriptions(pending).then((summaries) => {
      if (cancelled) return;
      const next = { ...local };
      for (const item of pending) {
        const summary = summaries[item.id];
        if (!summary) continue;
        next[item.id] = summary;
        writeCachedSummary(item.text, summary);
      }
      setAiSummaries(next);
    });
    return () => {
      cancelled = true;
    };
  }, [items, signature]);

  return useMemo(() => {
    const next: Record<string, string> = {};
    for (const item of items) {
      next[item.id] = aiSummaries[item.id] || shortenChangeDescription(item.changeLabel);
    }
    return next;
  }, [aiSummaries, items]);
}
