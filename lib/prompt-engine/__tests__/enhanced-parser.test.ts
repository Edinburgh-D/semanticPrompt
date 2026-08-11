import { describe, expect, it } from "vitest";

import {
  mergeLlmSupplement,
  parseVisualIntent,
  parseVisualIntentEnhanced,
} from "../parser";

describe("enhanced parser", () => {
  it("adds missing fields while preserving explicit rule fields", async () => {
    const result = await parseVisualIntentEnhanced(
      { text: "成年东亚女性，正面全身构图，穿黑色上衣，站在潮湿的清晨车站。" },
      async () => ({
        provider: "test",
        model: "fixture-model",
        candidate: {
          subject: {
            category: "animal",
            description: "一只猫",
          },
          environment: {
            settingType: "interior",
            location: "旧火车站候车厅",
            surfaces: ["潮湿的水磨石地面"],
            timeOfDay: "清晨",
          },
          lighting: {
            style: "窗外阴天漫射光",
            intensity: "dim",
            quality: "diffused",
            faceExposure: "natural",
          },
          aesthetic: {
            medium: "photography",
            realism: "photorealistic",
          },
        },
      }),
    );

    expect(result.spec.subject?.category).toBe("person");
    expect(result.spec.environment?.location).toBe("旧火车站候车厅");
    expect(result.spec.lighting?.quality).toBe("diffused");
    expect(result.provenance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "subject", source: "rule" }),
        expect.objectContaining({ path: "environment", source: "llm" }),
      ]),
    );
    expect(result.llm.ignoredPaths).toContain("subject");
  });

  it("rejects an invalid LLM enum through Zod", async () => {
    await expect(
      parseVisualIntentEnhanced(
        { text: "一个人物" },
        async () => ({
          provider: "test",
          model: "fixture-model",
          candidate: { composition: { framing: "cinematic-ish" } },
        }),
      ),
    ).rejects.toThrow();
  });

  it("records an attempted overwrite without changing the rule result", () => {
    const ruleOutput = parseVisualIntent({ text: "成年东亚女性，坐在楼梯上。" });
    const result = mergeLlmSupplement(ruleOutput, {
      subject: { category: "object", description: "雕塑" },
      color: { saturation: "low" },
    });

    expect(result.spec.subject).toEqual(ruleOutput.spec.subject);
    expect(result.spec.color?.saturation).toBe("low");
    expect(result.ignoredPaths).toContain("subject");
  });
});
