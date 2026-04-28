"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100 antialiased">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold">Application error</h1>
          <p className="mt-2 text-sm text-zinc-400">{error.message}</p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
