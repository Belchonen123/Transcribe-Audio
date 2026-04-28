export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10 skeleton-line h-10 w-48 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="skeleton-line mx-auto mb-6 h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800" />
        <div className="skeleton-line mx-auto h-4 w-64 rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="skeleton-line mx-auto mt-3 h-3 w-48 rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <div className="mt-10 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-3 skeleton-line h-4 w-[40%] rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="skeleton-line h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
