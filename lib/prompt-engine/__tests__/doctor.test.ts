import { describe, expect, it } from "vitest";

import { diagnoseVisualSpec } from "../doctor";
import { VISUAL_SPEC_EXAMPLE } from "../fixtures/visual-spec.example.fixture";

describe("diagnoseVisualSpec", () => {
  it("accepts the representative fixture without blocking errors", () => {
    const result = diagnoseVisualSpec(VISUAL_SPEC_EXAMPLE);

    expect(result.canCompile).toBe(true);
    expect(result.summary.errors).toBe(0);
  });

  it("detects lens and camera-distance conflicts", () => {
    const result = diagnoseVisualSpec({
      camera: {
        lens: { minFocalLengthMm: 85, maxFocalLengthMm: 85, type: "wide" },
        distance: { scale: "intimate" },
      },
      composition: { framing: "full-body" },
    });

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "camera-lens-type-mismatch", level: "warning" }),
        expect.objectContaining({ code: "camera-distance-framing-conflict", level: "error" }),
      ]),
    );
    expect(result.canCompile).toBe(false);
  });

  it("detects framing/crop and view/pose composition conflicts", () => {
    const result = diagnoseVisualSpec({
      composition: {
        framing: "full-body",
        crop: "只保留腰部以上",
        viewDirection: "front",
      },
      pose: { orientation: "back" },
    });

    expect(result.diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "composition-crop-framing-conflict",
        "composition-view-pose-conflict",
      ]),
    );
  });

  it("detects subject action and limb conflicts with the base pose", () => {
    const result = diagnoseVisualSpec({
      subject: { action: "站着看向镜头" },
      pose: { base: "sitting", legs: "双腿站直并向前奔跑" },
    });

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "pose-action-conflict", level: "error" }),
        expect.objectContaining({ code: "pose-limb-action-conflict", level: "warning" }),
      ]),
    );
  });

  it("detects contradictory spatial placement", () => {
    const result = diagnoseVisualSpec({
      wardrobe: {
        garments: [
          {
            category: "footwear",
            name: "鞋子",
            worn: false,
            placementWhenNotWorn: "放在人物左侧",
          },
        ],
      },
      environment: {
        props: [{ name: "脱下的鞋子", placement: "人物右侧" }],
      },
    });

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "spatial-placement-conflict", level: "error" }),
    );
  });

  it("detects incompatible wardrobe states and colors", () => {
    const result = diagnoseVisualSpec({
      wardrobe: {
        garments: [
          {
            name: "外套",
            color: "黑色",
            worn: true,
            placementWhenNotWorn: "搭在椅背上",
          },
          { name: "外套", color: "白色", worn: false },
        ],
      },
    });

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "wardrobe-worn-placement-conflict", level: "error" }),
        expect.objectContaining({ code: "wardrobe-duplicate-state-conflict", level: "error" }),
        expect.objectContaining({ code: "wardrobe-color-conflict", level: "warning" }),
      ]),
    );
  });

  it("emits a suggestion when full-body framing lacks camera distance", () => {
    const result = diagnoseVisualSpec({ composition: { framing: "full-body" } });

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "composition-camera-distance-unspecified",
        level: "suggestion",
      }),
    );
  });
});
