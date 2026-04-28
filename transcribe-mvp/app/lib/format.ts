/** Format byte size with KB/MB/GB (binary 1024). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  const decimals = i === 0 ? 0 : 1;
  const rounded =
    decimals === 0 ? Math.round(n) : Math.round(n * 10) / 10;
  return `${rounded} ${units[i]}`;
}

/** Relative label from a unix timestamp (ms), compared to now. */
export function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 30_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))}h ago`;
  const sevenDays = 7 * 24 * 60 * 60_000;
  if (diff < sevenDays) return `${Math.floor(diff / (24 * 60 * 60_000))}d ago`;
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Truncate at word boundary when possible. */
export function truncateText(
  text: string,
  maxChars: number,
): { preview: string; truncated: boolean } {
  const t = text.trim();
  if (t.length <= maxChars) return { preview: t, truncated: false };
  const slice = t.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.6) {
    return { preview: slice.slice(0, lastSpace).trimEnd() + "…", truncated: true };
  }
  return { preview: slice.trimEnd() + "…", truncated: true };
}
