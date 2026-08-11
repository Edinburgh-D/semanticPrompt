import { describe, expect, it } from "vitest";

import { parseVisualIntent } from "../parser";
import { ParserOutputSchema } from "../parser/schemas";
import { VisualSpecSchema } from "../schemas/visual-spec";

const EXAMPLE_TEXT = [
  "一名成年东亚女性，坐在老式住宅楼梯上，",
  "穿黑色无袖轻薄上衣和深色丝袜，",
  "鞋子脱下自然放在附近楼梯，正面全身构图，",
  "镜头距离人物数级台阶，",
  "28–32mm environmental fashion photography，",
  "低饱和灰白色调，昏暗但人物面部保持正常曝光。",
].join("");

describe("parseVisualIntent", () => {
  it("converts the representative Chinese description into a valid VisualSpec", () => {
    const result = parseVisualIntent({ text: EXAMPLE_TEXT });

    expect(ParserOutputSchema.safeParse(result).success).toBe(true);
    expect(VisualSpecSchema.safeParse(result.spec).success).toBe(true);
    expect(result.spec.subject).toMatchObject({
      category: "person",
      count: 1,
      ageGroup: "adult",
      genderPresentation: "女性",
    });
    expect(result.spec.pose).toMatchObject({ base: "sitting", orientation: "front" });
    expect(result.spec.composition).toMatchObject({ framing: "full-body", viewDirection: "front" });
    expect(result.spec.camera?.lens).toEqual({
      minFocalLengthMm: 28,
      maxFocalLengthMm: 32,
      type: "wide",
    });
    expect(result.spec.lighting).toMatchObject({ intensity: "dim", faceExposure: "natural" });
    expect(result.spec.color).toMatchObject({ saturation: "low", grading: "低饱和灰白色调" });
    expect(result.confidence.overall).toBeGreaterThanOrEqual(0.85);
    expect(result.ambiguities).toEqual([]);
    expect(result.missingInformation).toEqual([]);
  });

  it("reports conflicting deterministic cues as ambiguities", () => {
    const result = parseVisualIntent({
      text: "一名成年女性先站着又坐在椅子上，既要面部特写也要完整全身构图。",
    });

    expect(result.ambiguities.map(({ code }) => code)).toEqual(
      expect.arrayContaining(["multiple-pose-cues", "multiple-framing-cues"]),
    );
    expect(result.confidence.overall).toBeLessThan(0.5);
  });

  it("reports important missing information without creating invalid data", () => {
    const result = parseVisualIntent({ text: "低饱和灰白色调。" });

    expect(result.missingInformation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "subject", importance: "required" }),
        expect.objectContaining({ path: "composition.framing", importance: "recommended" }),
      ]),
    );
    expect(VisualSpecSchema.safeParse(result.spec).success).toBe(true);
  });

  it("treats a three-quarter view as one specific cue rather than a profile ambiguity", () => {
    const result = parseVisualIntent({ text: "一名成年女性，四分之三侧面半身构图。" });

    expect(result.spec.pose?.orientation).toBe("three-quarter");
    expect(result.ambiguities).not.toContainEqual(
      expect.objectContaining({ code: "multiple-view-cues" }),
    );
  });

  it("rejects empty input", () => {
    expect(() => parseVisualIntent({ text: "   " })).toThrow();
  });

  it("is deterministic for identical input", () => {
    expect(parseVisualIntent({ text: EXAMPLE_TEXT })).toEqual(
      parseVisualIntent({ text: EXAMPLE_TEXT }),
    );
  });
});
