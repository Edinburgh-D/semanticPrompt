import { describe, expect, it } from "vitest";

import { compileGptImagePrompt, PromptCompilationError } from "../pipeline";
import { diagnoseVisualSpec } from "../doctor";
import { CHINESE_PROMPT_CORPUS } from "../fixtures/chinese-prompt-corpus.fixture";
import { parseVisualIntent } from "../parser";
import { VisualSpecSchema } from "../schemas/visual-spec";

describe("Chinese corpus prompt pipeline", () => {
  it("keeps every parsed fixture valid and every declared conflict observable", () => {
    for (const promptFixture of CHINESE_PROMPT_CORPUS) {
      const parsed = parseVisualIntent({ text: promptFixture.input });
      expect(VisualSpecSchema.safeParse(parsed.spec).success, promptFixture.id).toBe(true);

      const doctor = diagnoseVisualSpec(parsed.spec);
      const codes = doctor.diagnostics.map(({ code }) => code);
      for (const expectedCode of promptFixture.expectedDoctorCodes) {
        expect(codes, `${promptFixture.id} lost ${expectedCode} after parsing`).toContain(expectedCode);
      }
    }
  });

  it("compiles every non-blocked fixture into a stable GPT Image prompt", () => {
    let compiledCount = 0;
    let blockedCount = 0;

    for (const promptFixture of CHINESE_PROMPT_CORPUS) {
      const parsed = parseVisualIntent({ text: promptFixture.input });
      const doctor = diagnoseVisualSpec(parsed.spec);

      if (!doctor.canCompile) {
        expect(
          () => compileGptImagePrompt(parsed.spec),
          `${promptFixture.id} should be blocked by Doctor`,
        ).toThrow(PromptCompilationError);
        blockedCount += 1;
        continue;
      }

      const first = compileGptImagePrompt(parsed.spec);
      const second = compileGptImagePrompt(parsed.spec);
      expect(first).toEqual(second);
      expect(first.output.adapter).toBe("gpt-image");
      expect(first.output.targetModel).toBe("gpt-image-2");
      expect(first.output.prompt.length, promptFixture.id).toBeGreaterThan(40);
      compiledCount += 1;
    }

    expect(compiledCount).toBeGreaterThan(30);
    expect(blockedCount).toBeGreaterThanOrEqual(5);
  });
});
