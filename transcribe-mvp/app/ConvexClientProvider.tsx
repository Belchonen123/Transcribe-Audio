"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo } from "react";

function convexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is missing. Add it to transcribe-mvp/.env.local (same deployment as `npx convex codegen`). Restart `npm run dev`.",
    );
  }
  return url;
}

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useMemo(() => new ConvexReactClient(convexUrl()), []);
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
