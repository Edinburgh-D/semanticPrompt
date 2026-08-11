import { GPT_IMAGE_ADAPTER, type GptImagePrompt, type ModelAdapter, type ModelPrompt } from "../adapters";
import { compileVisualSpec } from "../compiler";
import { diagnoseVisualSpec, type DoctorResult } from "../doctor";
import { PromptPipelineResultSchema, type PromptPipelineResult } from "./schemas";

export class PromptCompilationError extends Error {
  readonly doctor: DoctorResult;

  constructor(doctor: DoctorResult) {
    super("VisualSpec contains blocking diagnostics and cannot be compiled.");
    this.name = "PromptCompilationError";
    this.doctor = doctor;
  }
}

export function compilePromptWithAdapter<TPrompt extends ModelPrompt>(
  input: unknown,
  adapter: ModelAdapter<TPrompt>,
): Omit<PromptPipelineResult, "output"> & { output: TPrompt } {
  const doctor = diagnoseVisualSpec(input);
  if (!doctor.canCompile) throw new PromptCompilationError(doctor);

  const compiled = compileVisualSpec(input);
  const output = adapter.compile(compiled);
  const result = { doctor, compiled, output };

  PromptPipelineResultSchema.parse(result);
  return result;
}

export function compileGptImagePrompt(
  input: unknown,
): Omit<PromptPipelineResult, "output"> & { output: GptImagePrompt } {
  return compilePromptWithAdapter(input, GPT_IMAGE_ADAPTER);
}
