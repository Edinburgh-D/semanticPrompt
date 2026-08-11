import { z } from "zod";

import { VisualReferenceSchema } from "../schemas/visual-spec";

const NonEmptyTextSchema = z.string().trim().min(1);

export const CompiledSectionKeySchema = z.enum([
  "environment",
  "subject",
  "identity",
  "appearance",
  "wardrobe",
  "pose",
  "composition",
  "camera",
  "lighting",
  "color",
  "aesthetic",
]);

export const CompiledSectionSchema = z
  .object({
    key: CompiledSectionKeySchema,
    items: z.array(NonEmptyTextSchema).min(1),
  })
  .strict();

export const CompiledConstraintSchema = z
  .object({
    kind: z.enum(["requirement", "avoidance"]),
    target: NonEmptyTextSchema,
    instruction: NonEmptyTextSchema,
    priority: z.enum(["low", "medium", "high", "required"]),
  })
  .strict();

export const CompiledVisualPlanSchema = z
  .object({
    version: z.literal("1.0"),
    sourceSpecVersion: z.literal("1.0"),
    sections: z.array(CompiledSectionSchema),
    constraints: z.array(CompiledConstraintSchema),
    references: z.array(VisualReferenceSchema),
  })
  .strict();

export type CompiledSectionKey = z.infer<typeof CompiledSectionKeySchema>;
export type CompiledSection = z.infer<typeof CompiledSectionSchema>;
export type CompiledConstraint = z.infer<typeof CompiledConstraintSchema>;
export type CompiledVisualPlan = z.infer<typeof CompiledVisualPlanSchema>;
