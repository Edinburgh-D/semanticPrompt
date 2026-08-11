import { describe, expect, it } from "vitest";

import { GptImagePromptSchema } from "../adapters";
import { compileVisualSpec, CompiledVisualPlanSchema } from "../compiler";
import { COMPILER_FIXTURE_CASES } from "../fixtures/compiler-cases.fixture";
import { parseVisualIntent } from "../parser";
import {
  compileGptImagePrompt,
  PromptCompilationError,
  PromptPipelineResultSchema,
} from "../pipeline";

describe("compileVisualSpec", () => {
  it.each(COMPILER_FIXTURE_CASES)(
    "creates a complete model-neutral plan for $name",
    ({ spec, expectedSectionKeys }) => {
      const compiled = compileVisualSpec(spec);

      expect(CompiledVisualPlanSchema.safeParse(compiled).success).toBe(true);
      expect(compiled.sections.map(({ key }) => key)).toEqual(expectedSectionKeys);
    },
  );
});

describe("GPT_IMAGE_ADAPTER pipeline", () => {
  it.each(COMPILER_FIXTURE_CASES)(
    "produces a structured GPT Image prompt for $name",
    ({ spec, expectedPromptTerms }) => {
      const result = compileGptImagePrompt(spec);

      expect(PromptPipelineResultSchema.safeParse(result).success).toBe(true);
      expect(GptImagePromptSchema.safeParse(result.output).success).toBe(true);
      expect(result.output).toMatchObject({
        adapter: "gpt-image",
        adapterVersion: "1.0",
        targetModel: "gpt-image-2",
      });
      for (const term of expectedPromptTerms) {
        expect(result.output.prompt).toContain(term);
      }
      expect(result.output.prompt).not.toContain("undefined");
    },
  );

  it("is deterministic for the same VisualSpec", () => {
    const { spec } = COMPILER_FIXTURE_CASES[0];

    expect(compileGptImagePrompt(spec)).toEqual(compileGptImagePrompt(spec));
  });

  it("keeps requirements and avoidances in separate labeled sections", () => {
    const result = compileGptImagePrompt(COMPILER_FIXTURE_CASES[0].spec);

    expect(result.output.prompt).toContain("Constraints:\n");
    expect(result.output.prompt).toContain("Avoid:\n");
  });

  it("refuses to compile a VisualSpec with blocking Doctor errors", () => {
    expect(() =>
      compileGptImagePrompt({
        subject: { action: "站着" },
        pose: { base: "sitting" },
      }),
    ).toThrow(PromptCompilationError);
  });

  it("supports the complete natural-language to GPT Image prompt path", () => {
    const parsed = parseVisualIntent({
      text: "一名成年东亚女性坐在老式住宅楼梯上，正面全身构图，镜头相隔数级台阶，28–32mm，低饱和灰白色调，昏暗但面部保持正常曝光。",
    });
    const result = compileGptImagePrompt(parsed.spec);

    expect(result.output.prompt).toContain("成年东亚女性");
    expect(result.output.prompt).toContain("count: 1");
    expect(result.output.prompt).toContain("focal length: 28–32mm");
    expect(result.output.prompt).toContain("face exposure: natural");
  });
});
