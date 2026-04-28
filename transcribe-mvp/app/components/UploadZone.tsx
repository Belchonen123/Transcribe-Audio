"use client";

import { useCallback, useId, useState } from "react";
import { formatBytes, truncateText } from "@/app/lib/format";

const MAX_BYTES = 500 * 1024 * 1024;

function isAudioOrVideo(file: File): boolean {
  const t = file.type || "";
  return t.startsWith("audio/") || t.startsWith("video/");
}

export function UploadZone({
  onFile,
  uploading,
  uploadProgress,
  uploadingFilename,
}: {
  onFile: (file: File) => Promise<void>;
  uploading: boolean;
  uploadProgress: number;
  uploadingFilename?: string;
}) {
  const inputId = useId();
  const helperId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSubmit = useCallback(
    async (file: File) => {
      setError(null);
      if (!isAudioOrVideo(file)) {
        setError("Only audio or video files are supported.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(
          `File is too large (${formatBytes(file.size)}). Maximum size is ${formatBytes(MAX_BYTES)}.`,
        );
        return;
      }
      await onFile(file);
    },
    [onFile],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) await validateAndSubmit(f);
    },
    [validateAndSubmit],
  );

  const onInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) await validateAndSubmit(f);
      e.target.value = "";
    },
    [validateAndSubmit],
  );

  const zoneBase =
    "relative flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center outline-none transition-all duration-150";

  if (uploading) {
    const name = uploadingFilename ?? "Uploading…";
    const { preview } = truncateText(name, 48);
    const pct = Math.min(100, Math.max(0, uploadProgress));

    return (
      <section
        aria-busy="true"
        aria-labelledby={helperId}
        className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm ring-1 ring-zinc-900/[0.03] dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.04]"
      >
        <p id={helperId} className="mb-3 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {preview}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="relative h-full overflow-hidden rounded-full bg-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition-[width] duration-300 ease-out dark:bg-blue-500"
            style={{ width: `${pct}%` }}
          >
            <span className="pointer-events-none absolute inset-y-0 left-0 w-full animate-pulse bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-70 dark:via-white/10" aria-hidden />
          </div>
        </div>
        <p className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{pct}% • uploading…</span>
          <span className="tabular-nums opacity-80">
            {pct >= 100 ? "Finishing…" : "Sending file"}
          </span>
        </p>
      </section>
    );
  }

  return (
    <section aria-describedby={helperId}>
      <div className="relative">
        <label
          htmlFor={inputId}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDragOver(false);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDrop={onDrop}
          className={`relative ${zoneBase} cursor-pointer focus-within:border-blue-600 focus-within:bg-blue-50/70 focus-within:ring-2 focus-within:ring-blue-500/35 dark:focus-within:border-blue-500 dark:focus-within:bg-blue-950/35 dark:focus-within:ring-blue-400/25 ${
            dragOver
              ? "border-blue-600 bg-blue-50/90 shadow-[0_0_0_4px_rgba(59,130,246,0.12)] dark:border-blue-500 dark:bg-blue-950/50 dark:shadow-[0_0_0_4px_rgba(59,130,246,0.14)]"
              : "border-zinc-300 bg-white hover:border-blue-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-500 dark:hover:bg-zinc-900/80"
          } `}
        >
          <input
            id={inputId}
            type="file"
            accept="audio/*,video/*"
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            onChange={onInputChange}
            aria-label="Choose audio or video file"
          />
          <div className="pointer-events-none relative z-0 flex flex-col items-center gap-2">
            <svg
              className={`h-10 w-10 transition-colors duration-150 ${dragOver ? "scale-105 text-blue-700 dark:text-blue-400" : "text-blue-600 dark:text-blue-500"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="text-base font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
              {dragOver ? "Release to upload" : "Drop audio or video here"}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              or click to browse
            </span>
            <p id={helperId} className="mt-3 max-w-xs text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
              Works with common formats — max <strong className="font-medium text-zinc-600 dark:text-zinc-400">{formatBytes(MAX_BYTES)}</strong>.
              Drag-and-drop or pick one file.
            </p>
          </div>
        </label>
        {error ? (
          <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400" role="alert" aria-live="assertive">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
