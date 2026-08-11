import { z } from "zod";

const NonEmptyTextSchema = z.string().trim().min(1);

export const VisualSpecModuleSchema = z.enum([
  "subject",
  "identity",
  "appearance",
  "wardrobe",
  "pose",
  "composition",
  "camera",
  "environment",
  "lighting",
  "color",
  "aesthetic",
  "constraints",
  "negativeConstraints",
  "references",
]);

export const VisualSpecDiffKindSchema = z.enum(["added", "removed", "changed"]);

export const VisualSpecDiffEntrySchema = z
  .object({
    path: NonEmptyTextSchema,
    module: VisualSpecModuleSchema,
    kind: VisualSpecDiffKindSchema,
    before: z.unknown().optional(),
    after: z.unknown().optional(),
    locked: z.boolean(),
  })
  .strict();

export const VisualSpecDiffSchema = z.array(VisualSpecDiffEntrySchema);

export type VisualSpecModule = z.infer<typeof VisualSpecModuleSchema>;
export type VisualSpecDiffKind = z.infer<typeof VisualSpecDiffKindSchema>;
export type VisualSpecDiffEntry = z.infer<typeof VisualSpecDiffEntrySchema>;

