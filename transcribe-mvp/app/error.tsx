"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-600 dark:text-red-400">
          Something went wrong
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          This page hit an error
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {error.message || "Check the browser console for details."}
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[11px] text-zinc-400">ID: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
