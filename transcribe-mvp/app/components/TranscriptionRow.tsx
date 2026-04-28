"use client";

import { useMemo, useState } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { formatRelativeTime, truncateText } from "@/app/lib/format";
import {
  downloadText,
  formatTranscriptForDownload,
} from "@/app/lib/download";
import { StatusPill } from "@/app/components/StatusPill";

type RowItem = Doc<"transcriptions">;

function groupUtterances(
  utterances: NonNullable<RowItem["utterances"]>,
): Array<{ speaker: string; combined: string }> {
  const out: Array<{ speaker: string; combined: string }> = [];
  for (const u of utterances) {
    const speaker = String(u.speaker ?? "?");
    const text = u.text ?? "";
    const last = out[out.length - 1];
    if (last && last.speaker === speaker) {
      last.combined += (last.combined ? " " : "") + text;
    } else {
      out.push({ speaker, combined: text });
    }
  }
  return out;
}

export function TranscriptionRow({
  item,
  onRetry,
  onCopy,
  retryBusy,
}: {
  item: RowItem;
  onRetry: (id: Id<"transcriptions">) => void;
  onCopy: (text: string) => void;
  retryBusy?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copiedTick, setCopiedTick] = useState(false);

  const previewMax = 280;
  const transcriptBody = item.transcript ?? "";
  const hasUtterances =
    Array.isArray(item.utterances) && item.utterances.length > 0;

  const previewSource = useMemo(() => {
    if (hasUtterances && item.utterances?.length) {
      return item.utterances.map((u) => u.text).join(" ").trim();
    }
    return transcriptBody;
  }, [hasUtterances, item.utterances, transcriptBody]);

  const { preview: transcriptPreview, truncated: transcriptTruncated } =
    useMemo(
      () => truncateText(previewSource, previewMax),
      [previewSource, previewMax],
    );

  const fullCopyPayload = useMemo(() => {
    return formatTranscriptForDownload({
      filename: item.filename,
      transcript: item.transcript,
      utterances: item.utterances?.map((u) => ({
        speaker: String(u.speaker),
        text: u.text,
        start: u.start,
        end: u.end,
      })),
    });
  }, [item.filename, item.transcript, item.utterances]);

  const handleCopy = () => {
    onCopy(fullCopyPayload);
    setCopiedTick(true);
    window.setTimeout(() => setCopiedTick(false), 1500);
  };

  const handleDownload = () => {
    const base =
      item.filename.replace(/\.[^/.]+$/, "").trim() || "transcript";
    downloadText(`${base}.txt`, fullCopyPayload);
  };

  const speakerGroups = useMemo(() => {
    if (!hasUtterances || !item.utterances) return [];
    return groupUtterances(item.utterances);
  }, [hasUtterances, item.utterances]);

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition-all duration-150 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-900";

  return (
    <article className="group px-4 py-3 transition-all duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span
          className="min-w-0 flex-1 truncate font-medium tracking-tight text-zinc-900 dark:text-zinc-100"
          title={item.filename}
        >
          {item.filename}
        </span>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <StatusPill status={item.status} />
          <time
            className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500"
            dateTime={new Date(item._creationTime).toISOString()}
            title={new Date(item._creationTime).toLocaleString()}
          >
            {formatRelativeTime(item._creationTime)}
          </time>
        </div>
      </div>

      {item.status === "pending" || item.status === "processing" ? (
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="skeleton-line h-2 rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="skeleton-line h-2 w-[92%] rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="skeleton-line h-2 w-[80%] rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ) : null}

      {item.status === "completed" ? (
        <div className="mt-3">
          {!expanded ? (
            <div className="relative">
              <div className="pointer-events-none max-h-24 overflow-hidden text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                <p className="font-sans whitespace-pre-wrap">{transcriptPreview}</p>
              </div>
              {transcriptTruncated ? (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent dark:from-zinc-950" />
              ) : null}
              {transcriptTruncated ? (
                <button
                  type="button"
                  className="relative z-10 mt-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={() => setExpanded(true)}
                >
                  Show full transcript
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {hasUtterances ? (
                <div className="space-y-4">
                  {speakerGroups.map((g, i) => (
                    <div
                      key={`${g.speaker}-${i}`}
                      className="border-l-2 border-blue-200 pl-3 dark:border-blue-900"
                    >
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Speaker {g.speaker}:
                      </span>{" "}
                      <span className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {g.combined}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-sans whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {transcriptBody}
                </p>
              )}
              <button
                type="button"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => setExpanded(false)}
              >
                Show less
              </button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800/80">
            <button type="button" onClick={handleCopy} className={btn}>
              <svg className="h-4 w-4 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copiedTick ? "Copied!" : "Copy"}
            </button>
            <button type="button" onClick={handleDownload} className={btn}>
              <svg className="h-4 w-4 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download .txt
            </button>
          </div>
        </div>
      ) : null}

      {item.status === "failed" && item.error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-900 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-200">
          <p className="font-medium text-red-950 dark:text-red-100">Transcription failed</p>
          <p className="mt-1 leading-relaxed">{item.error}</p>
        </div>
      ) : null}

      {item.status === "failed" ? (
        <div className="mt-3">
          <button
            type="button"
            disabled={retryBusy}
            onClick={() => onRetry(item._id)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus-visible:ring-offset-zinc-950"
          >
            {retryBusy ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
            Retry
          </button>
        </div>
      ) : null}
    </article>
  );
}
