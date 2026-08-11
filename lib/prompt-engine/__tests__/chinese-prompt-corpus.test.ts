import { describe, expect, it } from "vitest";

import {
  CHINESE_PROMPT_CORPUS,
  ChinesePromptFixtureSchema,
} from "../fixtures/chinese-prompt-corpus.fixture";
import { parseVisualIntent } from "../parser";
import { diagnoseVisualSpec, DiagnosticCodeSchema } from "../doctor";
import { VisualSpecSchema } from "../schemas/visual-spec";

function valueAtPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

function isSubset(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && expected.every((expectedItem) =>
      actual.some((actualItem) => isSubset(actualItem, expectedItem))
    );
  }
  if (typeof expected === "object" && expected !== null) {
    if (typeof actual !== "object" || actual === null) return false;
    return Object.entries(expected).every(([key, value]) =>
      isSubset((actual as Record<string, unknown>)[key], value)
    );
  }
  return Object.is(actual, expected);
}

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

  it("parses every deterministic contract path without invention", () => {
    for (const promptFixture of CHINESE_PROMPT_CORPUS) {
      const parsed = parseVisualIntent({ text: promptFixture.input });
      for (const path of promptFixture.deterministicPaths) {
        const actual = valueAtPath(parsed.spec, path);
        const expected = valueAtPath(promptFixture.expected, path);
        expect(
          isSubset(actual, expected),
          `${promptFixture.id} did not satisfy ${path}\nExpected: ${JSON.stringify(expected)}\nReceived: ${JSON.stringify(actual)}`,
        ).toBe(true);
      }
    }
  });

  it("detects every conflict declared by the fixture corpus", () => {
    for (const promptFixture of CHINESE_PROMPT_CORPUS) {
      const result = diagnoseVisualSpec(promptFixture.expected);
      const codes = result.diagnostics.map(({ code }) => code);
      for (const code of promptFixture.expectedDoctorCodes) {
        expect(DiagnosticCodeSchema.safeParse(code).success, `${code} must be a registered diagnostic code`).toBe(true);
        expect(codes, `${promptFixture.id} did not report ${code}`).toContain(code);
      }
    }
  });
});
