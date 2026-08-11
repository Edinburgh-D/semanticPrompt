import { z } from "zod";

import { VisualSpecSchema } from "../schemas/visual-spec";

const NonEmptyTextSchema = z.string().trim().min(1);

export const ParserInputSchema = z
  .object({
    text: NonEmptyTextSchema,
    locale: z.literal("zh-CN").default("zh-CN"),
  })
  .strict();

export const ParserAmbiguitySchema = z
  .object({
    code: z.enum([
      "multiple-pose-cues",
      "multiple-framing-cues",
      "multiple-view-cues",
      "unclear-reference",
    ]),
    path: NonEmptyTextSchema,
    message: NonEmptyTextSchema,
    candidates: z.array(NonEmptyTextSchema).min(2),
    severity: z.enum(["warning", "blocking"]),
  })
  .strict();

export const MissingInformationSchema = z
  .object({
    path: NonEmptyTextSchema,
    reason: NonEmptyTextSchema,
    importance: z.enum(["required", "recommended", "optional"]),
    question: NonEmptyTextSchema.optional(),
  })
  .strict();

export const FieldConfidenceSchema = z
  .object({
    path: NonEmptyTextSchema,
    score: z.number().finite().min(0).max(1),
    evidence: z.array(NonEmptyTextSchema).min(1),
  })
  .strict();

export const ParseConfidenceSchema = z
  .object({
    overall: z.number().finite().min(0).max(1),
    fields: z.array(FieldConfidenceSchema),
  })
  .strict();

export const ParserOutputSchema = z
  .object({
    sourceText: NonEmptyTextSchema,
    spec: VisualSpecSchema,
    ambiguities: z.array(ParserAmbiguitySchema),
    missingInformation: z.array(MissingInformationSchema),
    confidence: ParseConfidenceSchema,
  })
  .strict();

export type ParserInput = z.input<typeof ParserInputSchema>;
export type ParsedParserInput = z.output<typeof ParserInputSchema>;
export type ParserAmbiguity = z.infer<typeof ParserAmbiguitySchema>;
export type MissingInformation = z.infer<typeof MissingInformationSchema>;
export type FieldConfidence = z.infer<typeof FieldConfidenceSchema>;
export type ParseConfidence = z.infer<typeof ParseConfidenceSchema>;
export type ParserOutput = z.infer<typeof ParserOutputSchema>;
