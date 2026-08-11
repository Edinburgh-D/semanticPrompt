import { z } from "zod";

const NonEmptyTextSchema = z.string().trim().min(1);

export const DiagnosticLevelSchema = z.enum(["error", "warning", "suggestion"]);

export const DiagnosticCategorySchema = z.enum([
  "camera",
  "composition",
  "pose",
  "spatial",
  "wardrobe",
]);

export const DiagnosticCodeSchema = z.enum([
  "camera-lens-type-mismatch",
  "camera-distance-framing-conflict",
  "composition-crop-framing-conflict",
  "composition-view-pose-conflict",
  "composition-camera-distance-unspecified",
  "pose-action-conflict",
  "pose-limb-action-conflict",
  "spatial-unplaced-item",
  "spatial-placement-conflict",
  "wardrobe-worn-placement-conflict",
  "wardrobe-duplicate-state-conflict",
  "wardrobe-color-conflict",
  "wardrobe-pose-state-conflict",
]);

export const DoctorDiagnosticSchema = z
  .object({
    code: DiagnosticCodeSchema,
    level: DiagnosticLevelSchema,
    category: DiagnosticCategorySchema,
    paths: z.array(NonEmptyTextSchema).min(1),
    message: NonEmptyTextSchema,
    suggestion: NonEmptyTextSchema,
  })
  .strict();

export const DoctorSummarySchema = z
  .object({
    errors: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
    suggestions: z.number().int().nonnegative(),
  })
  .strict();

export const DoctorResultSchema = z
  .object({
    canCompile: z.boolean(),
    diagnostics: z.array(DoctorDiagnosticSchema),
    summary: DoctorSummarySchema,
  })
  .strict();

export type DiagnosticLevel = z.infer<typeof DiagnosticLevelSchema>;
export type DiagnosticCategory = z.infer<typeof DiagnosticCategorySchema>;
export type DiagnosticCode = z.infer<typeof DiagnosticCodeSchema>;
export type DoctorDiagnostic = z.infer<typeof DoctorDiagnosticSchema>;
export type DoctorSummary = z.infer<typeof DoctorSummarySchema>;
export type DoctorResult = z.infer<typeof DoctorResultSchema>;
