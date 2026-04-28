import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { utteranceValidator } from "./schema";
import { v } from "convex/values";

const ASSEMBLYAI_SPEECH_MODELS = ["universal-3-pro", "universal-2"] as const;

const ASSEMBLY_FETCH_TIMEOUT_MS = 180_000;

async function assemblyFetch(
  url: string,
  init: Omit<RequestInit, "signal"> & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? ASSEMBLY_FETCH_TIMEOUT_MS;
  const { timeoutMs: _omit, ...rest } = init;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(tid);
  }
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createTranscription = mutation({
  args: {
    filename: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("transcriptions", {
      filename: args.filename,
      storageId: args.storageId,
      status: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.transcriptions.submitToAssembly, {
      id,
      storageId: args.storageId,
    });
    return id;
  },
});

export const updateStatus = internalMutation({
  args: {
    id: v.id("transcriptions"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
    assemblyId: v.optional(v.string()),
    transcript: v.optional(v.string()),
    utterances: v.optional(v.array(utteranceValidator)),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const patch = {
      ...(fields.status !== undefined && { status: fields.status }),
      ...(fields.assemblyId !== undefined && { assemblyId: fields.assemblyId }),
      ...(fields.transcript !== undefined && { transcript: fields.transcript }),
      ...(fields.utterances !== undefined && { utterances: fields.utterances }),
      ...(fields.error !== undefined && { error: fields.error }),
    };
    if (Object.keys(patch).length === 0) {
      return;
    }
    await ctx.db.patch(id, patch);
  },
});

export const handleWebhook = internalAction({
  args: {
    id: v.id("transcriptions"),
    assemblyId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      console.error("ASSEMBLYAI_API_KEY is not set");
      return;
    }

    const response = await assemblyFetch(
      `https://api.assemblyai.com/v2/transcript/${args.assemblyId}`,
      {
        headers: {
          authorization: apiKey,
        },
      },
    );
    const data = (await response.json()) as {
      status: string;
      text?: string;
      utterances?: Array<Record<string, unknown>>;
      error?: string;
    };

    if (!response.ok) {
      await ctx.runMutation(internal.transcriptions.updateStatus, {
        id: args.id,
        status: "failed",
        error: `AssemblyAI transcript fetch failed: ${response.status} ${JSON.stringify(data)}`,
      });
      return;
    }

    if (data.status === "completed") {
      await ctx.runMutation(internal.transcriptions.updateStatus, {
        id: args.id,
        status: "completed",
        transcript: data.text ?? "",
        utterances: Array.isArray(data.utterances)
          ? data.utterances.map((u: any) => ({
              speaker: String(u.speaker ?? ""),
              text: String(u.text ?? ""),
              start: Number(u.start ?? 0),
              end: Number(u.end ?? 0),
              confidence: Number(u.confidence ?? 0),
            }))
          : undefined,
      });
      return;
    }

    if (data.status === "error") {
      await ctx.runMutation(internal.transcriptions.updateStatus, {
        id: args.id,
        status: "failed",
        error: data.error ?? "AssemblyAI transcript error",
      });
    }
  },
});

export const submitToAssembly = internalAction({
  args: {
    id: v.id("transcriptions"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.transcriptions.updateStatus, {
        id: args.id,
        status: "processing",
      });

      const audioUrl = await ctx.storage.getUrl(args.storageId);
      if (!audioUrl) {
        throw new Error("Could not generate storage URL for audio file");
      }

      const apiKey = process.env.ASSEMBLYAI_API_KEY;
      if (!apiKey) {
        throw new Error("ASSEMBLYAI_API_KEY is not set");
      }

      const siteUrl = process.env.CONVEX_SITE_URL;
      if (!siteUrl) {
        throw new Error("CONVEX_SITE_URL is not set");
      }

      const webhookSecret = process.env.WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error("WEBHOOK_SECRET is not set");
      }

      const transcriptPayload = {
        speech_models: [...ASSEMBLYAI_SPEECH_MODELS],
        audio_url: audioUrl,
        speaker_labels: true,
        webhook_url: `${siteUrl}/assemblyai-webhook?ref=${args.id}`,
        webhook_auth_header_name: "x-assembly-secret",
        webhook_auth_header_value: webhookSecret,
      };

      const transcriptResponse = await assemblyFetch(
        "https://api.assemblyai.com/v2/transcript",
        {
          method: "POST",
          headers: {
            authorization: apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transcriptPayload),
          timeoutMs: 60_000,
        },
      );
      if (!transcriptResponse.ok) {
        throw new Error(
          `AssemblyAI transcript failed: ${transcriptResponse.status} ${await transcriptResponse.text()}`,
        );
      }
      const job = (await transcriptResponse.json()) as { id: string };

      await ctx.runMutation(internal.transcriptions.updateStatus, {
        id: args.id,
        status: "processing",
        assemblyId: job.id,
      });
    } catch (error) {
      let message =
        error instanceof Error ? error.message : String(error);
      if (error instanceof Error && error.name === "AbortError") {
        message =
          "AssemblyAI request timed out. Try a shorter file or check your connection.";
      }
      await ctx.runMutation(internal.transcriptions.updateStatus, {
        id: args.id,
        status: "failed",
        error: message,
      });
    }
  },
});

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cap = Math.min(Math.max(args.limit ?? 50, 1), 100);
    return await ctx.db.query("transcriptions").order("desc").take(cap);
  },
});

export const remove = mutation({
  args: { id: v.id("transcriptions") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record) return;
    await ctx.storage.delete(record.storageId);
    await ctx.db.delete(args.id);
  },
});

export const clearHistory = mutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("transcriptions").collect();
    for (const row of rows) {
      await ctx.storage.delete(row.storageId);
      await ctx.db.delete(row._id);
    }
    return rows.length;
  },
});

export const retry = mutation({
  args: { id: v.id("transcriptions") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Transcription not found");
    if (record.status !== "failed") {
      throw new Error("Can only retry failed transcriptions");
    }
    await ctx.db.patch(args.id, {
      status: "pending",
      error: undefined,
      assemblyId: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.transcriptions.submitToAssembly, {
      id: args.id,
      storageId: record.storageId,
    });
  },
});
