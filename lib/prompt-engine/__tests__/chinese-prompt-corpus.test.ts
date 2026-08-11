import { describe, expect, it } from "vitest";

import {
  CHINESE_PROMPT_CORPUS,
  ChinesePromptFixtureSchema,
} from "../fixtures/chinese-prompt-corpus.fixture";
import { VisualSpecSchema } from "../schemas/visual-spec";

describe("Chinese prompt fixture corpus", () => {
  it("contains 47 unique, validated real-world fixtures", () => {
    expect(CHINESE_PROMPT_CORPUS).toHaveLength(47);
    expect(new Set(CHINESE_PROMPT_CORPUS.map(({ id }) => id))).toHaveLength(47);

    for (const promptFixture of CHINESE_PROMPT_CORPUS) {
      expect(ChinesePromptFixtureSchema.safeParse(promptFixture).success).toBe(true);
      expect(VisualSpecSchema.safeParse(promptFixture.expected).success).toBe(true);
    }
  });

  it("covers every prioritized visual dimension", () => {
    const dimensions = new Set(CHINESE_PROMPT_CORPUS.flatMap(({ dimensions }) => dimensions));

    expect(dimensions).toEqual(
      new Set(["pose", "camera", "wardrobe", "lighting", "spatial", "constraints"]),
    );
  });

  it("keeps contextual expressions assigned to the hybrid parser", () => {
    const hybridFixtures = CHINESE_PROMPT_CORPUS.filter(({ parserTier }) => parserTier === "hybrid");

    expect(hybridFixtures.length).toBeGreaterThanOrEqual(5);
    expect(hybridFixtures.every(({ llmOnlyPaths }) => llmOnlyPaths.length > 0)).toBe(true);
  });
});
