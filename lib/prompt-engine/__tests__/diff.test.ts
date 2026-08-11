import { describe, expect, it } from "vitest";

import { diffVisualSpecs, mergeVisualSpecRespectingLocks } from "../diff";
import { VISUAL_SPEC_EXAMPLE } from "../fixtures/visual-spec.example.fixture";
import { VisualSpecSchema } from "../schemas/visual-spec";

describe("VisualSpec diff and locks", () => {
  it("returns no changes for equivalent specs", () => {
    expect(diffVisualSpecs(VISUAL_SPEC_EXAMPLE, VISUAL_SPEC_EXAMPLE)).toEqual([]);
  });

  it("reports a stable wardrobe change", () => {
    const after = VisualSpecSchema.parse({
      ...VISUAL_SPEC_EXAMPLE,
      wardrobe: {
        ...VISUAL_SPEC_EXAMPLE.wardrobe,
        style: "极简白色晚装",
      },
    });

    expect(diffVisualSpecs(VISUAL_SPEC_EXAMPLE, after)).toContainEqual({
      path: "wardrobe.style",
      module: "wardrobe",
      kind: "changed",
      before: "简洁、低调的日常时装",
      after: "极简白色晚装",
      locked: false,
    });
  });

  it("keeps identity while applying a wardrobe change", () => {
    const current = VisualSpecSchema.parse({
      ...VISUAL_SPEC_EXAMPLE,
      locks: { identity: true },
    });
    const candidate = VisualSpecSchema.parse({
      ...VISUAL_SPEC_EXAMPLE,
      identity: { face: { ancestryPresentation: "北欧" } },
      wardrobe: { style: "红色礼服" },
    });

    const result = mergeVisualSpecRespectingLocks(current, candidate);

    expect(result.identity).toEqual(current.identity);
    expect(result.wardrobe?.style).toBe("红色礼服");
  });

  it("keeps pose while replacing the environment", () => {
    const current = VisualSpecSchema.parse({
      ...VISUAL_SPEC_EXAMPLE,
      locks: { pose: true },
    });
    const candidate = VisualSpecSchema.parse({
      ...VISUAL_SPEC_EXAMPLE,
      pose: { base: "standing" },
      environment: { settingType: "exterior", location: "雨夜街道" },
    });

    const result = mergeVisualSpecRespectingLocks(current, candidate);

    expect(result.pose).toEqual(current.pose);
    expect(result.environment?.location).toBe("雨夜街道");
  });
});
