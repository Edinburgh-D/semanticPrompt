import {
  VisualSpecSchema,
  type VisualSpecInput,
} from "../schemas/visual-spec";

export const VISUAL_SPEC_EXAMPLE_INPUT = {
  version: "1.0",
  subject: {
    category: "person",
    count: 1,
    description: "一名成年东亚女性",
    ageGroup: "adult",
    genderPresentation: "女性",
    action: "坐在老式住宅楼梯的台阶上",
  },
  identity: {
    face: {
      ancestryPresentation: "东亚",
    },
    immutableFeatures: [],
  },
  appearance: {
    notableDetails: ["人物面部清晰可辨"],
  },
  wardrobe: {
    style: "简洁、低调的日常时装",
    garments: [
      {
        category: "top",
        name: "无袖轻薄上衣",
        color: "黑色",
        material: "轻薄面料",
        worn: true,
      },
      {
        category: "hosiery",
        name: "丝袜",
        color: "深色",
        worn: true,
      },
      {
        category: "footwear",
        name: "鞋子",
        worn: false,
        placementWhenNotWorn: "自然放在人物附近的楼梯台阶上",
      },
    ],
  },
  pose: {
    base: "sitting",
    orientation: "front",
    torso: "躯干自然朝向镜头",
    arms: "手臂自然放松",
    legs: "双腿保持自然坐姿",
    contactPoints: ["身体坐在楼梯台阶上", "双脚未穿鞋"],
  },
  composition: {
    framing: "full-body",
    orientation: "portrait",
    subjectPlacement: "center",
    viewDirection: "front",
    crop: "完整保留人物全身和附近的鞋子",
    foreground: "镜头与人物之间可见数级楼梯",
    background: "老式住宅楼梯及楼道结构",
  },
  camera: {
    lens: {
      minFocalLengthMm: 28,
      maxFocalLengthMm: 32,
      type: "wide",
    },
    distance: {
      scale: "medium",
      description: "镜头与人物保持可容纳正面全身构图的距离",
      relativeReference: "相隔数级楼梯",
    },
    height: "eye-level",
    depthOfField: "deep",
    focusTarget: "人物全身，面部保持清晰",
    captureStyle: "environmental fashion photography",
  },
  environment: {
    settingType: "interior",
    location: "老式住宅楼梯间",
    description: "有年代感、略显陈旧的住宅楼梯环境",
    architecturalFeatures: ["连续楼梯台阶", "老式住宅楼道"],
    surfaces: ["磨损的楼梯表面", "灰白墙面"],
    props: [
      {
        name: "脱下的鞋子",
        placement: "人物附近的楼梯台阶上",
        state: "自然放置",
        prominence: "supporting",
      },
    ],
    atmosphere: "安静、昏暗、生活化",
  },
  lighting: {
    style: "昏暗环境光下的自然写实时装光线",
    intensity: "dim",
    quality: "diffused",
    sources: ["楼梯间环境光"],
    colorTemperature: "neutral",
    contrast: "low",
    faceExposure: "natural",
  },
  color: {
    saturation: "low",
    palette: ["灰色", "白色", "黑色"],
    dominantColors: ["低饱和灰色", "灰白色"],
    contrast: "low",
    grading: "低饱和灰白色调",
    temperature: "neutral",
  },
  aesthetic: {
    medium: "photography",
    genres: ["environmental fashion photography", "生活化人像摄影"],
    mood: ["克制", "安静", "略带年代感"],
    realism: "photorealistic",
    texture: "保留老式住宅楼梯的真实材质感",
  },
  constraints: [
    {
      target: "composition.framing",
      requirement: "必须为正面全身构图，并保留人物附近的鞋子",
      priority: "required",
    },
    {
      target: "lighting.faceExposure",
      requirement: "环境可以昏暗，但人物面部必须保持正常曝光",
      priority: "required",
    },
    {
      target: "wardrobe.garments",
      requirement: "鞋子必须脱下，不能穿在脚上",
      priority: "required",
    },
  ],
  negativeConstraints: [
    {
      target: "composition",
      avoid: ["裁切人物脚部", "近景或半身构图", "鞋子移出画面"],
      severity: "high",
    },
    {
      target: "lighting",
      avoid: ["人物面部欠曝", "人物面部变成剪影"],
      severity: "high",
    },
    {
      target: "color",
      avoid: ["高饱和色彩", "强烈暖色调"],
      severity: "medium",
    },
  ],
  references: [],
} satisfies VisualSpecInput;

export const VISUAL_SPEC_EXAMPLE = VisualSpecSchema.parse(
  VISUAL_SPEC_EXAMPLE_INPUT,
);
