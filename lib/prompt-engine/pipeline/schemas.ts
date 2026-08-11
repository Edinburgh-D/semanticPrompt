import { z } from "zod";

import { ModelPromptSchema } from "../adapters";
import { CompiledVisualPlanSchema } from "../compiler";
import { DoctorResultSchema } from "../doctor";

export const PromptPipelineResultSchema = z
  .object({
    doctor: DoctorResultSchema,
    compiled: CompiledVisualPlanSchema,
    output: ModelPromptSchema,
  })
  .strict();

export type PromptPipelineResult = z.infer<typeof PromptPipelineResultSchema>;
