import type { VisualSpecInput } from "../schemas/visual-spec";
import { VisualSpecSchema } from "../schemas/visual-spec";
import {
  ParserInputSchema,
  ParserOutputSchema,
  type FieldConfidence,
  type MissingInformation,
  type ParserAmbiguity,
  type ParserInput,
  type ParserOutput,
} from "./schemas";

type PoseBase = NonNullable<NonNullable<VisualSpecInput["pose"]>["base"]>;
type PoseOrientation = NonNullable<NonNullable<VisualSpecInput["pose"]>["orientation"]>;
type Framing = NonNullable<NonNullable<VisualSpecInput["composition"]>["framing"]>;

interface Cue<T extends string> {
  value: T;
  terms: readonly string[];
}

const POSE_CUES: readonly Cue<PoseBase>[] = [
  { value: "sitting", terms: ["坐在", "坐着", "坐姿"] },
  { value: "standing", terms: ["站在", "站着", "站立"] },
  { value: "kneeling", terms: ["跪在", "跪姿"] },
  { value: "lying", terms: ["躺在", "躺着", "平躺"] },
  { value: "crouching", terms: ["蹲在", "蹲着", "蹲姿"] },
  { value: "moving", terms: ["走路", "行走", "跑步", "奔跑"] },
];

const ORIENTATION_CUES: readonly Cue<PoseOrientation>[] = [
  { value: "front", terms: ["正面", "面对镜头", "朝向镜头"] },
  { value: "three-quarter", terms: ["四分之三侧面", "3/4侧面", "三分之二侧面"] },
  { value: "profile", terms: ["侧面", "侧身"] },
  { value: "back", terms: ["背面", "背对镜头"] },
];

const FRAMING_CUES: readonly Cue<Framing>[] = [
  { value: "extreme-close-up", terms: ["极端特写", "局部特写"] },
  { value: "close-up", terms: ["面部特写", "脸部特写", "近景特写"] },
  { value: "medium-close-up", terms: ["胸像", "胸部以上"] },
  { value: "medium", terms: ["半身", "腰部以上"] },
  { value: "medium-full", terms: ["七分身", "膝盖以上"] },
  { value: "full-body", terms: ["全身构图", "全身照", "完整全身"] },
  { value: "extreme-wide", terms: ["超远景", "大远景"] },
  { value: "wide", terms: ["远景", "广角环境"] },
];

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function findCues<T extends string>(text: string, cues: readonly Cue<T>[]): Cue<T>[] {
  return cues.filter(({ terms }) => includesAny(text, terms));
}

function evidenceFor(text: string, terms: readonly string[]): string[] {
  return terms.filter((term) => text.includes(term));
}

function inferLensType(focalLengthMm: number) {
  if (focalLengthMm <= 24) return "ultra-wide" as const;
  if (focalLengthMm <= 35) return "wide" as const;
  if (focalLengthMm <= 70) return "normal" as const;
  return "telephoto" as const;
}

function roundConfidence(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Deterministic Chinese parser for common MVP visual phrases.
 * It is intentionally conservative: unmatched details remain in sourceText and are not invented.
 */
export function parseVisualIntent(input: ParserInput): ParserOutput {
  const { text } = ParserInputSchema.parse(input);
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const spec: VisualSpecInput = {};
  const ambiguities: ParserAmbiguity[] = [];
  const missingInformation: MissingInformation[] = [];
  const confidenceFields: FieldConfidence[] = [];

  const markConfidence = (path: string, score: number, evidence: string[]) => {
    confidenceFields.push({ path, score, evidence });
  };

  const personTerms = ["人物", "人像", "女性", "女人", "男性", "男人", "女孩", "男孩", "模特"];
  const personEvidence = evidenceFor(normalizedText, personTerms);
  if (personEvidence.length > 0) {
    const adult = includesAny(normalizedText, ["成年", "成人"]);
    const olderAdult = includesAny(normalizedText, ["老年", "老人", "年长"]);
    const feminine = includesAny(normalizedText, ["女性", "女人", "女孩", "女模特"]);
    const masculine = includesAny(normalizedText, ["男性", "男人", "男孩", "男模特"]);
    const eastAsian = includesAny(normalizedText, ["东亚", "亚洲"]);
    const descriptors = [
      adult ? "成年" : olderAdult ? "年长" : undefined,
      eastAsian ? "东亚" : undefined,
      feminine ? "女性" : masculine ? "男性" : "人物",
    ].filter((value): value is string => value !== undefined);

    spec.subject = {
      category: "person",
      count: includesAny(normalizedText, ["一名", "一个", "一位", "单人"]) ? 1 : undefined,
      description: descriptors.join(""),
      ageGroup: adult ? "adult" : olderAdult ? "older-adult" : undefined,
      genderPresentation: feminine ? "女性" : masculine ? "男性" : undefined,
    };
    if (eastAsian) {
      spec.identity = { face: { ancestryPresentation: "东亚" } };
    }
    markConfidence("subject", adult || eastAsian ? 0.95 : 0.84, personEvidence);
  }

  const poseMatches = findCues(normalizedText, POSE_CUES);
  if (poseMatches.length > 0) {
    const selected = poseMatches[0];
    spec.pose = { base: selected.value };
    spec.subject = {
      ...spec.subject,
      action: selected.value === "sitting" ? "坐着" : selected.value,
    };
    markConfidence("pose.base", 0.96, evidenceFor(normalizedText, selected.terms));
  }
  if (poseMatches.length > 1) {
    ambiguities.push({
      code: "multiple-pose-cues",
      path: "pose.base",
      message: "描述中出现了多个基础姿势，当前按首个明确姿势解析。",
      candidates: poseMatches.map(({ value }) => value),
      severity: "blocking",
    });
  }

  const rawOrientationMatches = findCues(normalizedText, ORIENTATION_CUES);
  const hasThreeQuarterCue = rawOrientationMatches.some(({ value }) => value === "three-quarter");
  const orientationMatches = hasThreeQuarterCue
    ? rawOrientationMatches.filter(({ value }) => value !== "profile")
    : rawOrientationMatches;
  if (orientationMatches.length > 0) {
    const selected = orientationMatches[0];
    spec.pose = { ...spec.pose, orientation: selected.value };
    spec.composition = {
      ...spec.composition,
      viewDirection:
        selected.value === "profile"
          ? "side"
          : selected.value === "back"
            ? "rear"
            : selected.value === "mixed"
              ? undefined
              : selected.value,
    };
    markConfidence("pose.orientation", 0.94, evidenceFor(normalizedText, selected.terms));
  }
  if (orientationMatches.length > 1) {
    ambiguities.push({
      code: "multiple-view-cues",
      path: "pose.orientation",
      message: "描述中出现了多个人物朝向，当前按首个明确朝向解析。",
      candidates: orientationMatches.map(({ value }) => value),
      severity: "blocking",
    });
  }

  const framingMatches = findCues(normalizedText, FRAMING_CUES);
  if (framingMatches.length > 0) {
    const selected = framingMatches[0];
    spec.composition = { ...spec.composition, framing: selected.value };
    markConfidence("composition.framing", 0.97, evidenceFor(normalizedText, selected.terms));
  }
  if (framingMatches.length > 1) {
    ambiguities.push({
      code: "multiple-framing-cues",
      path: "composition.framing",
      message: "描述中出现了互不相同的景别，当前按首个明确景别解析。",
      candidates: framingMatches.map(({ value }) => value),
      severity: "blocking",
    });
  }

  const garments: NonNullable<NonNullable<VisualSpecInput["wardrobe"]>["garments"]> = [];
  if (normalizedText.includes("上衣")) {
    garments.push({
      category: "top",
      name: includesAny(normalizedText, ["无袖上衣", "无袖轻薄上衣"])
        ? "无袖轻薄上衣"
        : "上衣",
      color: normalizedText.includes("黑色") ? "黑色" : undefined,
      material: normalizedText.includes("轻薄") ? "轻薄面料" : undefined,
      worn: true,
    });
  }
  if (includesAny(normalizedText, ["丝袜", "连裤袜"])) {
    garments.push({
      category: "hosiery",
      name: normalizedText.includes("丝袜") ? "丝袜" : "连裤袜",
      color: includesAny(normalizedText, ["深色丝袜", "深色连裤袜"]) ? "深色" : undefined,
      worn: true,
    });
  }
  if (includesAny(normalizedText, ["鞋子", "鞋"])) {
    const removed = includesAny(normalizedText, ["鞋子脱下", "脱下鞋", "脱鞋", "未穿鞋"]);
    garments.push({
      category: "footwear",
      name: "鞋子",
      worn: removed ? false : undefined,
      placementWhenNotWorn:
        removed && includesAny(normalizedText, ["附近楼梯", "附近台阶", "旁边楼梯", "旁边台阶"])
          ? "自然放在人物附近的楼梯台阶上"
          : undefined,
    });
  }
  if (garments.length > 0) {
    spec.wardrobe = { garments };
    markConfidence("wardrobe.garments", 0.9, garments.map(({ name }) => name));
  }

  const focalLengthMatch = normalizedText.match(
    /(\d{1,3})(?:\s*(?:-|–|—|~|至|到)\s*(\d{1,3}))?\s*mm/i,
  );
  if (focalLengthMatch) {
    const minFocalLengthMm = Number(focalLengthMatch[1]);
    const maxFocalLengthMm = Number(focalLengthMatch[2] ?? focalLengthMatch[1]);
    spec.camera = {
      lens: {
        minFocalLengthMm,
        maxFocalLengthMm,
        type: inferLensType((minFocalLengthMm + maxFocalLengthMm) / 2),
      },
    };
    markConfidence("camera.lens", 0.99, [focalLengthMatch[0]]);
  }
  if (includesAny(normalizedText, ["数级台阶", "几级台阶", "相隔台阶"])) {
    spec.camera = {
      ...spec.camera,
      distance: {
        scale: "medium",
        relativeReference: "镜头与人物相隔数级台阶",
      },
    };
    markConfidence("camera.distance", 0.92, ["数级台阶"]);
  }
  if (includesAny(normalizedText.toLowerCase(), ["environmental fashion photography", "环境时装摄影"])) {
    spec.camera = { ...spec.camera, captureStyle: "environmental fashion photography" };
    spec.aesthetic = {
      medium: "photography",
      genres: ["environmental fashion photography"],
      realism: "photorealistic",
    };
    markConfidence("aesthetic", 0.98, ["environmental fashion photography"]);
  }

  if (includesAny(normalizedText, ["住宅楼梯", "住宅楼道", "楼梯间"])) {
    const old = includesAny(normalizedText, ["老式", "老旧", "陈旧"]);
    spec.environment = {
      settingType: "interior",
      location: old ? "老式住宅楼梯间" : "住宅楼梯间",
      description: old ? "有年代感的老式住宅楼梯环境" : "住宅楼梯环境",
      architecturalFeatures: ["住宅楼梯", "楼道结构"],
    };
    markConfidence("environment", 0.96, old ? ["老式", "住宅楼梯"] : ["住宅楼梯"]);
  }

  if (includesAny(normalizedText, ["昏暗", "暗光", "低照度"])) {
    spec.lighting = {
      intensity: "dim",
      faceExposure: includesAny(normalizedText, ["面部保持正常曝光", "脸部正常曝光", "面部正常曝光"])
        ? "natural"
        : undefined,
    };
    markConfidence("lighting", 0.94, evidenceFor(normalizedText, ["昏暗", "暗光", "面部保持正常曝光"]));
  }

  if (includesAny(normalizedText, ["低饱和", "低饱和度"])) {
    const grayWhite = includesAny(normalizedText, ["灰白", "灰白色调"]);
    spec.color = {
      saturation: "low",
      palette: grayWhite ? ["灰色", "白色", "黑色"] : undefined,
      dominantColors: grayWhite ? ["低饱和灰色", "灰白色"] : undefined,
      grading: grayWhite ? "低饱和灰白色调" : "低饱和色调",
    };
    markConfidence("color", 0.97, grayWhite ? ["低饱和", "灰白色调"] : ["低饱和"]);
  }

  if (!spec.subject?.category) {
    missingInformation.push({
      path: "subject",
      reason: "没有识别到明确的主体。",
      importance: "required",
      question: "画面的主要人物或物体是什么？",
    });
  }
  if (!spec.composition?.framing) {
    missingInformation.push({
      path: "composition.framing",
      reason: "没有指定景别，可能导致主体裁切不符合预期。",
      importance: "recommended",
      question: "希望使用特写、半身、全身还是远景构图？",
    });
  }
  if (!spec.environment) {
    missingInformation.push({
      path: "environment",
      reason: "没有识别到明确环境。",
      importance: "recommended",
      question: "画面发生在什么环境中？",
    });
  }
  if (!spec.lighting) {
    missingInformation.push({
      path: "lighting",
      reason: "没有指定光线特征。",
      importance: "optional",
      question: "希望画面使用怎样的亮度和光线质感？",
    });
  }

  const categoryCount = new Set(confidenceFields.map(({ path }) => path.split(".")[0])).size;
  const averageFieldConfidence =
    confidenceFields.length === 0
      ? 0
      : confidenceFields.reduce((sum, field) => sum + field.score, 0) / confidenceFields.length;
  const coverageFactor = Math.min(1, categoryCount / 6);
  const ambiguityPenalty = ambiguities.filter(({ severity }) => severity === "blocking").length * 0.12;
  const overall = roundConfidence(
    Math.max(0.05, Math.min(0.99, averageFieldConfidence * coverageFactor - ambiguityPenalty)),
  );

  return ParserOutputSchema.parse({
    sourceText: normalizedText,
    spec: VisualSpecSchema.parse(spec),
    ambiguities,
    missingInformation,
    confidence: {
      overall,
      fields: confidenceFields,
    },
  });
}
