import { httpRouter } from "convex/server";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/assemblyai-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const secret = request.headers.get("x-assembly-secret");
      if (secret !== process.env.WEBHOOK_SECRET) {
        return new Response("unauthorized", { status: 401 });
      }

      const url = new URL(request.url);
      const ref = url.searchParams.get("ref");
      if (!ref) {
        return new Response("missing ref", { status: 400 });
      }

      const body = (await request.json()) as { transcript_id?: string };
      if (!body.transcript_id) {
        return new Response("missing transcript_id", { status: 400 });
      }

      await ctx.runAction(internal.transcriptions.handleWebhook, {
        id: ref as Id<"transcriptions">,
        assemblyId: body.transcript_id,
      });
    } catch (err) {
      console.error("webhook handler error:", err);
    }
    return new Response(null, { status: 200 });
  }),
});

export default http;
