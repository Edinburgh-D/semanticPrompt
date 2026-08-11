import { describe, expect, it } from "vitest";

import { VISUAL_SPEC_EXAMPLE } from "../fixtures/visual-spec.example.fixture";
import { VISUAL_SPEC_DEFAULTS, VisualSpecSchema } from "../schemas/visual-spec";

describe("VisualSpecSchema", () => {
  it("accepts a valid specification", () => {
    const result = VisualSpecSchema.safeParse({
      subject: {
        category: "person",
        count: 1,
        ageGroup: "adult",
      },
      composition: {
        framing: "full-body",
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid enum value", () => {
    const result = VisualSpecSchema.safeParse({
      composition: {
        framing: "cinematic-ish",
      },
    });

    expect(result.success).toBe(false);
  });

  it("accepts missing optional fields and applies neutral defaults", () => {
    const result = VisualSpecSchema.parse({});

    expect(result).toEqual(VISUAL_SPEC_DEFAULTS);
    expect(result).toEqual({
      version: "1.0",
      constraints: [],
      negativeConstraints: [],
      references: [],
      locks: {
        identity: false,
        wardrobe: false,
        pose: false,
        camera: false,
        environment: false,
        lighting: false,
      },
    });
  });

  it("rejects non-boolean module locks", () => {
    const result = VisualSpecSchema.safeParse({ locks: { identity: "yes" } });

    expect(result.success).toBe(false);
  });

  it("rejects referenceStrength outside the normalized range", () => {
    const result = VisualSpecSchema.safeParse({
      identity: {
        referenceStrength: 1.01,
      },
    });

    expect(result.success).toBe(false);
  });

  it("validates the complete example fixture", () => {
    const result = VisualSpecSchema.safeParse(VISUAL_SPEC_EXAMPLE);

    expect(result.success).toBe(true);
    expect(VISUAL_SPEC_EXAMPLE.camera?.lens).toMatchObject({
      minFocalLengthMm: 28,
      maxFocalLengthMm: 32,
      type: "wide",
    });
    expect(VISUAL_SPEC_EXAMPLE.wardrobe?.garments?.find(({ category }) => category === "footwear"))
      .toMatchObject({
        worn: false,
        placementWhenNotWorn: "自然放在人物附近的楼梯台阶上",
      });
    expect(VISUAL_SPEC_EXAMPLE.lighting?.faceExposure).toBe("natural");
  });
});
