"use client";

import { useCallback, useEffect, useState } from "react";

export type ToastKind = "success" | "error";

export type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, kind, message }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, push, dismiss };
}

function ToastSurface({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const styles =
    toast.kind === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-50"
      : "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/60 dark:text-red-50";

  const icon =
    toast.kind === "success" ? (
      <span className="mt-0.5 shrink-0 rounded-full bg-emerald-200/90 p-0.5 text-emerald-900 dark:bg-emerald-800/90 dark:text-emerald-100">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    ) : (
      <span className="mt-0.5 shrink-0 rounded-full bg-red-200/90 p-0.5 text-red-900 dark:bg-red-900/90 dark:text-red-100">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </span>
    );

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className={`animate-slide-in-right pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg border px-3 py-2.5 text-sm shadow-lg shadow-zinc-900/[0.06] ring-1 ring-black/[0.03] transition-all duration-150 dark:shadow-black/30 dark:ring-white/[0.05] ${styles}`}
    >
      {icon}
      <span className="min-w-0 flex-1 pt-0.5 leading-snug">{toast.message}</span>
      <button
        type="button"
        className="-mr-0.5 shrink-0 rounded-md p-0.5 opacity-70 ring-offset-white transition-all duration-150 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-zinc-900"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-h-[min(60vh,420px)] flex-col gap-2 overflow-y-auto scroll-smooth sm:overflow-visible"
      aria-live={toasts.some((t) => t.kind === "error") ? "assertive" : "polite"}
    >
      {toasts.map((t) => (
        <ToastSurface key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
