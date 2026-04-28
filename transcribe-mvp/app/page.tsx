"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { UploadZone } from "@/app/components/UploadZone";
import { TranscriptionRow } from "@/app/components/TranscriptionRow";
import { ToastContainer, useToasts } from "@/app/components/Toast";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { formatHistoryExport, downloadText } from "@/app/lib/download";

function uploadFileWithProgress(
  uploadUrl: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ storageId: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText) as { storageId: string };
          resolve(json);
        } catch {
          reject(new Error("Invalid upload response"));
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new Error("Upload aborted"));
    xhr.send(file);
  });
}

type ConfirmKind =
  | null
  | { mode: "one"; id: Id<"transcriptions">; label: string }
  | { mode: "all"; count: number };

/** Stable reference — Convex useQuery must not receive a fresh object each render. */
const TRANSCRIPTION_LIST_ARGS = { limit: 80 } as const;

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFilename, setUploadingFilename] = useState<string | undefined>();
  const [retryingId, setRetryingId] = useState<Id<"transcriptions"> | null>(null);
  const [filterQ, setFilterQ] = useState("");
  const [confirmDel, setConfirmDel] = useState<ConfirmKind>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"transcriptions"> | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const list = useQuery(api.transcriptions.list, TRANSCRIPTION_LIST_ARGS);
  const generateUploadUrl = useMutation(api.transcriptions.generateUploadUrl);
  const createTranscription = useMutation(api.transcriptions.createTranscription);
  const retryMutation = useMutation(api.transcriptions.retry);
  const removeMutation = useMutation(api.transcriptions.remove);
  const clearHistoryMutation = useMutation(api.transcriptions.clearHistory);

  const { toasts, push, dismiss } = useToasts();

  const filtered = useMemo(() => {
    if (!list) return [];
    const q = filterQ.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => i.filename.toLowerCase().includes(q));
  }, [list, filterQ]);

  const stats = useMemo(() => {
    const s = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
    list?.forEach((item) => {
      switch (item.status) {
        case "pending":
          s.pending += 1;
          break;
        case "processing":
          s.processing += 1;
          break;
        case "completed":
          s.completed += 1;
          break;
        case "failed":
          s.failed += 1;
          break;
        default:
          break;
      }
    });
    return s;
  }, [list]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadingFilename(file.name);
      setUploadProgress(0);
      try {
        const uploadUrl = await generateUploadUrl();
        const json = await uploadFileWithProgress(uploadUrl, file, setUploadProgress);
        await createTranscription({
          filename: file.name,
          storageId: json.storageId as Id<"_storage">,
        });
        push("success", `${file.name} uploaded — transcribing…`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        push("error", msg);
      } finally {
        setUploading(false);
        setUploadingFilename(undefined);
        setUploadProgress(0);
      }
    },
    [createTranscription, generateUploadUrl, push],
  );

  const onRetry = useCallback(
    async (id: Id<"transcriptions">) => {
      setRetryingId(id);
      try {
        await retryMutation({ id });
        push("success", "Retry queued");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        push("error", msg);
      } finally {
        setRetryingId(null);
      }
    },
    [retryMutation, push],
  );

  const requestDelete = useCallback((id: Id<"transcriptions">) => {
    const row = list?.find((x) => x._id === id);
    setConfirmDel({
      mode: "one",
      id,
      label: row?.filename ?? "this item",
    });
  }, [list]);

  const requestClearAll = useCallback(() => {
    const n = list?.length ?? 0;
    if (n === 0) return;
    setConfirmDel({ mode: "all", count: n });
  }, [list?.length]);

  const runConfirmedDelete = useCallback(async () => {
    if (!confirmDel) return;
    setBusyDelete(true);
    if (confirmDel.mode === "one") setDeletingId(confirmDel.id);
    try {
      if (confirmDel.mode === "one") {
        await removeMutation({ id: confirmDel.id });
        push("success", "Removed from history");
      } else {
        const n = await clearHistoryMutation({});
        push(
          "success",
          `Deleted ${n} ${n === 1 ? "recording" : "recordings"}`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      push("error", msg);
    } finally {
      setBusyDelete(false);
      setDeletingId(null);
      setConfirmDel(null);
    }
  }, [confirmDel, removeMutation, clearHistoryMutation, push]);

  const exportVisible = useCallback(() => {
    if (filtered.length === 0) {
      push("error", "Nothing to export");
      return;
    }
    const payload = filtered.map((doc: Doc<"transcriptions">) => ({
      filename: doc.filename,
      status: doc.status,
      transcript: doc.transcript,
      utterances: doc.utterances?.map((u) => ({
        speaker: String(u.speaker),
        text: u.text,
        start: u.start,
        end: u.end,
      })),
      error: doc.error,
    }));
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadText(`transcribe-export-${stamp}.txt`, formatHistoryExport(payload));
    push("success", `Exported ${filtered.length} ${filtered.length === 1 ? "item" : "items"}`);
  }, [filtered, push]);

  const onCopy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
  }, []);

  const count = list?.length ?? 0;
  const filteredEmpty =
    list !== undefined && list.length > 0 && filtered.length === 0;

  const dialogCopy =
    confirmDel?.mode === "one"
      ? {
          title: "Remove from history?",
          description: `“${confirmDel.label}” will be deleted permanently, including the uploaded audio file. This cannot be undone.`,
          confirmLabel: "Remove",
        }
      : confirmDel?.mode === "all"
        ? {
            title: "Clear entire history?",
            description: `Delete all ${confirmDel.count} ${confirmDel.count === 1 ? "recording" : "recordings"} and their stored files from Convex. This cannot be undone.`,
            confirmLabel: "Delete everything",
          }
        : { title: "", description: "", confirmLabel: "Confirm" };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[200] -translate-y-16 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-lg transition-all duration-150 focus:translate-y-0 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:bg-blue-500 dark:focus-visible:ring-offset-zinc-950"
      >
        Skip to content
      </a>

      <ConfirmDialog
        open={confirmDel !== null}
        title={dialogCopy.title}
        description={dialogCopy.description}
        confirmLabel={dialogCopy.confirmLabel}
        cancelLabel="Cancel"
        danger
        busy={busyDelete}
        onConfirm={runConfirmedDelete}
        onCancel={() => !busyDelete && setConfirmDel(null)}
      />

      <main id="main-content" className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:pb-20">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-6 border-b border-zinc-200/80 pb-8 dark:border-zinc-800/80">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
              AssemblyAI · Convex
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Transcribe
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Speaker-aware transcription — upload audio or video; transcripts appear here as they finish.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <a
              href="#"
              className="rounded-lg p-2 text-zinc-400 transition-all duration-150 hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 dark:focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              aria-label="GitHub repository"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.089 2.91.833.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.699 1.028 1.59 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
            </a>
          </div>
        </header>

        <UploadZone
          onFile={onFile}
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadingFilename={uploadingFilename}
        />

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id="recent-heading"
              className="text-lg font-medium tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Recent transcriptions
            </h2>
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {count} total
            </span>
            {list !== undefined && count > 0 ? (
              <div className="flex flex-wrap gap-1.5 text-[11px] font-medium">
                {stats.pending > 0 ? (
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {stats.pending} queued
                  </span>
                ) : null}
                {stats.processing > 0 ? (
                  <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                    {stats.processing} active
                  </span>
                ) : null}
                {stats.completed > 0 ? (
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300">
                    {stats.completed} done
                  </span>
                ) : null}
                {stats.failed > 0 ? (
                  <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-red-900 dark:bg-red-950/80 dark:text-red-300">
                    {stats.failed} failed
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {count > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={exportVisible}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm transition-all duration-150 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                <svg className="h-3.5 w-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export {filterQ.trim() ? "visible" : "all"} ({filtered.length})
              </button>
              <button
                type="button"
                onClick={requestClearAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-900 transition-all duration-150 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900/80 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/80 dark:focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear history
              </button>
            </div>
          ) : null}
        </div>

        {count > 0 ? (
          <div className="mt-4">
            <label className="relative block">
              <span className="sr-only">Filter by filename</span>
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
                placeholder="Filter files… (press /)"
                autoComplete="off"
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400"
              />
            </label>
          </div>
        ) : null}

        <div className="mt-4" aria-labelledby="recent-heading">
          {list === undefined ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="mb-3 skeleton-line h-4 w-[40%] rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="skeleton-line h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="skeleton-line mt-2 h-3 w-[88%] rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <svg
                className="mb-4 h-12 w-12 text-zinc-400 dark:text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.25}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                No transcriptions yet
              </p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Upload a file above to get started.
              </p>
            </div>
          ) : filteredEmpty ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                No files match “{filterQ.trim()}”
              </p>
              <button
                type="button"
                onClick={() => setFilterQ("")}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-900/[0.04] dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.05]">
              {filtered.map((item, index) => (
                <li
                  key={item._id}
                  style={{
                    animationDelay: `${Math.min(index, 12) * 45}ms`,
                  }}
                  className="animate-enter-up opacity-0 [animation-fill-mode:forwards]"
                >
                  <TranscriptionRow
                    item={item}
                    onRetry={onRetry}
                    onCopy={onCopy}
                    retryBusy={retryingId === item._id}
                    requestDelete={requestDelete}
                    deleteBusy={deletingId === item._id && busyDelete}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="mt-12 border-t border-zinc-200/90 pt-8 text-center text-xs leading-relaxed text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          Live updates · Async pipeline ·{" "}
          <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1 py-px font-mono text-[10px] text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            /
          </kbd>{" "}
          focuses search
        </footer>
      </main>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
