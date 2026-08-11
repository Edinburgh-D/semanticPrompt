import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VisualSpecSchema } from "../../prompt-engine";
import { DEFAULT_STUDIO_SOURCE, useStudioStore } from "../studio-store";

describe("Studio deterministic parsing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    useStudioStore.setState({
      sourceText: DEFAULT_STUDIO_SOURCE,
      model: "gpt-image",
      status: "idle",
      error: undefined,
      parserOutput: undefined,
      enhancedOutput: undefined,
      baselineSpec: undefined,
      draftSpec: undefined,
      doctor: undefined,
      compiledPrompt: undefined,
      diff: [],
    });
  });

  it("marks edited source as waiting for a new parse", () => {
    useStudioStore.getState().setSourceText("成年女性站在窗边，正面半身构图。\n");

    expect(useStudioStore.getState().status).toBe("dirty");
    expect(useStudioStore.getState().sourceText).toContain("站在窗边");
  });

  it("produces a valid VisualSpec and GPT Image prompt without an API call", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    useStudioStore.getState().parseDeterministically();

    const state = useStudioStore.getState();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.status).toBe("ready");
    expect(state.error).toBeUndefined();
    expect(VisualSpecSchema.safeParse(state.draftSpec).success).toBe(true);
    expect(state.doctor).toBeDefined();
    expect(state.compiledPrompt).toContain("Create a photorealistic image");
  });
});
