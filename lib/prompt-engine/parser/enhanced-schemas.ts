import { z } from "zod";

import { ParserOutputSchema } from "./schemas";

const NonEmptyTextSchema = z.string().trim().min(1);

export const ParserSourceSchema = z.enum(["rule", "llm"]);
export const LlmProviderSchema = z.enum(["openai", "deepseek", "test"]);

export const FieldProvenanceSchema = z
  .object({
    path: NonEmptyTextSchema,
    source: ParserSourceSchema,
    confidence: z.number().finite().min(0).max(1),
    evidence: z.array(NonEmptyTextSchema).min(1),
  })
  .strict();

export const LlmParserMetaSchema = z
  .object({
    provider: LlmProviderSchema,
    model: NonEmptyTextSchema,
    appliedPaths: z.array(NonEmptyTextSchema),
    ignoredPaths: z.array(NonEmptyTextSchema),
  })
  .strict();

export const EnhancedParserOutputSchema = ParserOutputSchema.extend({
  provenance: z.array(FieldProvenanceSchema),
  llm: LlmParserMetaSchema,
}).strict();

export type ParserSource = z.infer<typeof ParserSourceSchema>;
export type LlmProvider = z.infer<typeof LlmProviderSchema>;
export type FieldProvenance = z.infer<typeof FieldProvenanceSchema>;
export type LlmParserMeta = z.infer<typeof LlmParserMetaSchema>;
export type EnhancedParserOutput = z.infer<typeof EnhancedParserOutputSchema>;

