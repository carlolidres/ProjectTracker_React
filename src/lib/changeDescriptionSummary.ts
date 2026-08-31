export const CARD_CHANGE_MAX_CHARS = 88;
export const CHANGE_SUMMARY_CACHE_PREFIX = "pm-change-summary:";

export function shortenChangeDescription(
  text: string,
  maxChars = CARD_CHANGE_MAX_CHARS,
): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.toUpperCase() === "N/A") return "";
  if (cleaned.length <= maxChars) return cleaned;
  const boundary = cleaned.search(/[.!?](\s|$)/);
  const sentence = boundary >= 0 ? cleaned.slice(0, boundary + 1) : cleaned;
  if (sentence.length > 12 && sentence.length <= maxChars) return sentence;
  const cut = cleaned.slice(0, maxChars).replace(/\s+\S*$/, "");
  return `${cut || cleaned.slice(0, maxChars)}…`;
}

export function changeSourceHash(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function changeSummaryCacheKey(text: string): string {
  return `${CHANGE_SUMMARY_CACHE_PREFIX}${changeSourceHash(text)}`;
}
