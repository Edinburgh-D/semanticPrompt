import { create } from "zustand";

import {
  compileGptImagePrompt,
  diagnoseVisualSpec,
  diffVisualSpecs,
  EnhancedParserOutputSchema,
  mergeVisualSpecRespectingLocks,
  parseVisualIntent,
  VisualSpecSchema,
  type DoctorResult,
  type EnhancedParserOutput,
  type ParserOutput,
  type VisualSpec,
  type VisualSpecDiffEntry,
  type VisualSpecLocks,
  type VisualSpecModule,
} from "../prompt-engine";

export const DEFAULT_STUDIO_SOURCE =
  "成年东亚女性，坐在老式住宅楼梯上，黑色无袖轻薄上衣，深色丝袜，鞋子脱下自然放在附近楼梯，正面全身构图，镜头距离人物数级台阶，28–32mm environmental fashion photography，低饱和灰白色调，昏暗但人物面部保持正常曝光，老式住宅楼梯环境。";

export type StudioStatus = "idle" | "dirty" | "parsing" | "enhancing" | "ready" | "error";
export type StudioModel = "gpt-image";

interface StudioArtifacts {
  doctor: DoctorResult;
  compiledPrompt?: string;
}

interface StudioState {
  sourceText: string;
  model: StudioModel;
  status: StudioStatus;
  error?: string;
  parserOutput?: ParserOutput;
  enhancedOutput?: EnhancedParserOutput;
  baselineSpec?: VisualSpec;
  draftSpec?: VisualSpec;
  doctor?: DoctorResult;
  compiledPrompt?: string;
  diff: VisualSpecDiffEntry[];
  setSourceText: (value: string) => void;
  setModel: (value: StudioModel) => void;
  parseDeterministically: () => void;
  enhanceWithLlm: () => Promise<void>;
  updateModule: (module: VisualSpecModule, value: unknown) => { ok: boolean; error?: string };
  toggleLock: (module: keyof VisualSpecLocks) => void;
  resetDraft: () => void;
}

function buildArtifacts(spec: VisualSpec): StudioArtifacts {
  const doctor = diagnoseVisualSpec(spec);
  if (!doctor.canCompile) return { doctor };

  return {
    doctor,
    compiledPrompt: compileGptImagePrompt(spec).output.prompt,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "发生未知错误。";
}

function apiErrorMessage(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("error" in value)) return undefined;
  return typeof value.error === "string" ? value.error : undefined;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  sourceText: DEFAULT_STUDIO_SOURCE,
  model: "gpt-image",
  status: "idle",
  diff: [],

  setSourceText: (sourceText) => set({ sourceText, status: "dirty", error: undefined }),
  setModel: (model) => set({ model }),

  parseDeterministically: () => {
    const { sourceText, draftSpec } = get();
    set({ status: "parsing", error: undefined });

    try {
      const parserOutput = parseVisualIntent({ text: sourceText });
      const nextSpec = draftSpec
        ? mergeVisualSpecRespectingLocks(draftSpec, parserOutput.spec)
        : parserOutput.spec;
      const baselineSpec = draftSpec ?? nextSpec;
      const artifacts = buildArtifacts(nextSpec);

      set({
        status: "ready",
        parserOutput: { ...parserOutput, spec: nextSpec },
        enhancedOutput: undefined,
        baselineSpec,
        draftSpec: nextSpec,
        doctor: artifacts.doctor,
        compiledPrompt: artifacts.compiledPrompt,
        diff: diffVisualSpecs(baselineSpec, nextSpec),
      });
    } catch (error) {
      set({ status: "error", error: `解析失败：${errorMessage(error)}` });
    }
  },

  enhanceWithLlm: async () => {
    const { sourceText, draftSpec } = get();
    set({ status: "enhancing", error: undefined });

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: sourceText, locale: "zh-CN" }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(apiErrorMessage(body) ?? `服务返回 ${response.status}`);

      const enhancedOutput = EnhancedParserOutputSchema.parse(body);
      const nextSpec = draftSpec
        ? mergeVisualSpecRespectingLocks(draftSpec, enhancedOutput.spec)
        : enhancedOutput.spec;
      const baselineSpec = draftSpec ?? nextSpec;
      const artifacts = buildArtifacts(nextSpec);
      set({
        status: "ready",
        parserOutput: { ...enhancedOutput, spec: nextSpec },
        enhancedOutput: { ...enhancedOutput, spec: nextSpec },
        baselineSpec,
        draftSpec: nextSpec,
        doctor: artifacts.doctor,
        compiledPrompt: artifacts.compiledPrompt,
        diff: diffVisualSpecs(baselineSpec, nextSpec),
      });
    } catch (error) {
      set({ status: "error", error: errorMessage(error) });
    }
  },

  updateModule: (module, value) => {
    const { draftSpec, baselineSpec } = get();
    if (!draftSpec) return { ok: false, error: "请先解析一段视觉描述。" };
    if (module in draftSpec.locks && draftSpec.locks[module as keyof VisualSpecLocks]) {
      return { ok: false, error: "该模块已锁定。请先解锁再修改。" };
    }

    try {
      const candidate = VisualSpecSchema.parse({ ...draftSpec, [module]: value });
      const artifacts = buildArtifacts(candidate);
      set({
        status: "ready",
        error: undefined,
        draftSpec: candidate,
        doctor: artifacts.doctor,
        compiledPrompt: artifacts.compiledPrompt,
        diff: baselineSpec ? diffVisualSpecs(baselineSpec, candidate) : [],
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: `字段不合法：${errorMessage(error)}` };
    }
  },

  toggleLock: (module) => {
    const { draftSpec } = get();
    if (!draftSpec) return;

    const candidate = VisualSpecSchema.parse({
      ...draftSpec,
      locks: { ...draftSpec.locks, [module]: !draftSpec.locks[module] },
    });
    set({ draftSpec: candidate });
  },

  resetDraft: () => {
    const { baselineSpec, draftSpec } = get();
    if (!baselineSpec) return;
    const candidate = VisualSpecSchema.parse({
      ...baselineSpec,
      locks: draftSpec?.locks ?? baselineSpec.locks,
    });
    const artifacts = buildArtifacts(candidate);
    set({
      status: "ready",
      error: undefined,
      draftSpec: candidate,
      doctor: artifacts.doctor,
      compiledPrompt: artifacts.compiledPrompt,
      diff: [],
    });
  },
}));
