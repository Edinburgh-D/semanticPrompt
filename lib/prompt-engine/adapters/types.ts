import { z } from "zod";

import type { CompiledVisualPlan } from "../compiler";

const NonEmptyTextSchema = z.string().trim().min(1);

export const ModelPromptSchema = z
  .object({
    adapter: NonEmptyTextSchema,
    adapterVersion: NonEmptyTextSchema,
    targetModel: NonEmptyTextSchema,
    prompt: NonEmptyTextSchema,
  })
  .strict();

export type ModelPrompt = z.infer<typeof ModelPromptSchema>;

export interface ModelAdapter<TPrompt extends ModelPrompt = ModelPrompt> {
  readonly id: string;
  compile(plan: CompiledVisualPlan): TPrompt;
}
