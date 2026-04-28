function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Convert milliseconds offset to HH:MM:SS */
export function msToHms(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function formatTranscriptForDownload(item: {
  filename: string;
  transcript?: string;
  utterances?: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
  }>;
}): string {
  if (
    Array.isArray(item.utterances) &&
    item.utterances.length > 0
  ) {
    const lines = item.utterances.map((u) => {
      const ts = msToHms(u.start);
      return `[${ts}] Speaker ${u.speaker}: ${u.text}`;
    });
    return lines.join("\n\n");
  }
  const body = item.transcript ?? "";
  return `# Transcript: ${item.filename}\n\n${body}`;
}
