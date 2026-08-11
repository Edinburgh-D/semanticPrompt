import { VISUAL_SPEC_EXAMPLE } from "./visual-spec.example.fixture";
import { VisualSpecSchema, type VisualSpec } from "../schemas/visual-spec";

export interface CompilerFixtureCase {
  name: string;
  spec: VisualSpec;
  expectedSectionKeys: string[];
  expectedPromptTerms: string[];
}

const PRODUCT_STILL_LIFE_SPEC = VisualSpecSchema.parse({
  subject: {
    category: "object",
    count: 1,
    description: "一只无品牌的哑光白色陶瓷咖啡杯",
    attributes: ["圆润杯身", "细窄杯柄"],
  },
  composition: {
    framing: "medium-close-up",
    orientation: "square",
    subjectPlacement: "rule-of-thirds",
    foreground: "浅色木桌表面",
    background: "干净的浅灰背景",
    negativeSpace: "杯子右侧保留充足留白",
  },
  camera: {
    lens: { minFocalLengthMm: 50, maxFocalLengthMm: 50, type: "normal" },
    distance: { scale: "near" },
    height: "eye-level",
    depthOfField: "shallow",
    focusTarget: "杯子的前缘和杯柄",
    captureStyle: "minimal product photography",
  },
  environment: {
    settingType: "studio",
    location: "极简产品摄影棚",
    surfaces: ["浅色木桌", "浅灰无缝背景"],
    atmosphere: "安静、克制、整洁",
  },
  lighting: {
    style: "柔和侧光",
    intensity: "balanced",
    direction: "画面左侧",
    quality: "soft",
    sources: ["大型柔光箱"],
    colorTemperature: "neutral",
    contrast: "low",
    faceExposure: "not-applicable",
  },
  color: {
    saturation: "low",
    palette: ["哑光白", "浅灰", "浅木色"],
    contrast: "low",
    temperature: "neutral",
  },
  aesthetic: {
    medium: "photography",
    genres: ["minimal product photography"],
    realism: "photorealistic",
    texture: "真实陶瓷与木纹材质",
  },
  constraints: [
    {
      target: "subject",
      requirement: "杯子表面不得出现品牌标志或文字",
      priority: "required",
    },
  ],
  negativeConstraints: [
    {
      target: "environment",
      avoid: ["多余餐具", "杂乱背景"],
      severity: "high",
    },
  ],
});

export const COMPILER_FIXTURE_CASES: CompilerFixtureCase[] = [
  {
    name: "environmental fashion portrait",
    spec: VISUAL_SPEC_EXAMPLE,
    expectedSectionKeys: [
      "environment",
      "subject",
      "identity",
      "appearance",
      "wardrobe",
      "pose",
      "composition",
      "camera",
      "lighting",
      "color",
      "aesthetic",
    ],
    expectedPromptTerms: [
      "老式住宅楼梯间",
      "一名成年东亚女性",
      "focal length: 28–32mm",
      "environmental fashion photography",
      "低饱和灰白色调",
      "人物面部必须保持正常曝光",
    ],
  },
  {
    name: "minimal product still life",
    spec: PRODUCT_STILL_LIFE_SPEC,
    expectedSectionKeys: [
      "environment",
      "subject",
      "composition",
      "camera",
      "lighting",
      "color",
      "aesthetic",
    ],
    expectedPromptTerms: [
      "哑光白色陶瓷咖啡杯",
      "minimal product photography",
      "杯子右侧保留充足留白",
      "不得出现品牌标志或文字",
      "杂乱背景",
    ],
  },
];
