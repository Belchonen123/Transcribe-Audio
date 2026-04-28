type Status = "pending" | "processing" | "completed" | "failed";

export function StatusPill({ status }: { status: Status }) {
  const base =
    "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-all duration-150";

  if (status === "pending") {
    return (
      <span
        className={`${base} bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`}
      >
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Pending
      </span>
    );
  }

  if (status === "processing") {
    return (
      <span
        className={`${base} animate-pulse bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300`}
      >
        <svg
          className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Processing
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span
        className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300`}
      >
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Completed
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300`}
    >
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
      Failed
    </span>
  );
}
