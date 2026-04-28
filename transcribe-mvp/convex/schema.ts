import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const utteranceValidator = v.object({
  speaker: v.string(),
  text: v.string(),
  start: v.number(),
  end: v.number(),
  confidence: v.number(),
});

export default defineSchema({
  transcriptions: defineTable({
    filename: v.string(),
    storageId: v.id("_storage"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    assemblyId: v.optional(v.string()),
    transcript: v.optional(v.string()),
    utterances: v.optional(v.array(utteranceValidator)),
    error: v.optional(v.string()),
  }),
});
