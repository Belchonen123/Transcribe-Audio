"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { UploadZone } from "@/app/components/UploadZone";
import { TranscriptionRow } from "@/app/components/TranscriptionRow";
import { ToastContainer, useToasts } from "@/app/components/Toast";

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

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFilename, setUploadingFilename] = useState<string | undefined>();
  const [retryingId, setRetryingId] = useState<Id<"transcriptions"> | null>(null);

  const list = useQuery(api.transcriptions.list);
  const generateUploadUrl = useMutation(api.transcriptions.generateUploadUrl);
  const createTranscription = useMutation(api.transcriptions.createTranscription);
  const retryMutation = useMutation(api.transcriptions.retry);

  const { toasts, push, dismiss } = useToasts();

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

  const onCopy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
  }, []);

  const count = list?.length ?? 0;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[200] -translate-y-16 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-lg transition-all duration-150 focus:translate-y-0 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:bg-blue-500 dark:focus-visible:ring-offset-zinc-950"
      >
        Skip to content
      </a>

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

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <h2
            id="recent-heading"
            className="text-lg font-medium tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Recent transcriptions
          </h2>
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {count} total
          </span>
        </div>

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
          ) : (
            <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-900/[0.04] dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.05]">
              {list.map((item, index) => (
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
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="mt-12 border-t border-zinc-200/90 pt-8 text-center text-xs leading-relaxed text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          Status updates over the wire · Files processed asynchronously ·{" "}
          <span className="text-zinc-500 dark:text-zinc-400">Keep this tab open while transcribing</span>
        </footer>
      </main>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
