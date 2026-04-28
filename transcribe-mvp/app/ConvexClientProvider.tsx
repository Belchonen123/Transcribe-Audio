"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo } from "react";

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  const client = useMemo(() => {
    if (!url) return null;
    return new ConvexReactClient(url);
  }, [url]);

  if (!url || !client) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
        <div className="max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-400">
            Configuration
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            NEXT_PUBLIC_CONVEX_URL is missing
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Add your Convex deployment URL to{" "}
            <code className="rounded bg-white px-1 py-0.5 font-mono text-xs dark:bg-zinc-900">
              transcribe-mvp/.env.local
            </code>
            :
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-white p-4 text-left text-xs text-zinc-800 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700">
            {`NEXT_PUBLIC_CONVEX_URL=https://YOUR_DEPLOYMENT.convex.cloud`}
          </pre>
          <p className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
            Copy the URL from the Convex dashboard (same deployment as{" "}
            <code className="font-mono">npx convex dev</code>), then restart{" "}
            <code className="font-mono">npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
