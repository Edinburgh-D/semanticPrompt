import { z } from "zod";

import { VisualSpecSchema } from "../schemas/visual-spec";

const FixtureDimensionSchema = z.enum([
  "pose",
  "camera",
  "wardrobe",
  "lighting",
  "spatial",
  "constraints",
]);

export const ChinesePromptFixtureSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    dimensions: z.array(FixtureDimensionSchema).min(1),
    parserTier: z.enum(["deterministic", "hybrid"]),
    input: z.string().trim().min(8),
    expected: VisualSpecSchema,
    deterministicPaths: z.array(z.string().trim().min(1)),
    llmOnlyPaths: z.array(z.string().trim().min(1)).default([]),
    expectedDoctorCodes: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

export type ChinesePromptFixture = z.infer<typeof ChinesePromptFixtureSchema>;

function fixture(input: z.input<typeof ChinesePromptFixtureSchema>): ChinesePromptFixture {
  return ChinesePromptFixtureSchema.parse(input);
}

/**
 * Hand-written Chinese prompts modelled on common image-generation requests.
 * `deterministicPaths` are the conservative rule-parser contract; `llmOnlyPaths`
 * document semantics that require contextual reasoning instead of keyword rules.
 */
export const CHINESE_PROMPT_CORPUS: readonly ChinesePromptFixture[] = [
  fixture({
    id: "pose-chair-hands-knees",
    dimensions: ["pose", "spatial"],
    parserTier: "deterministic",
    input: "成年女性坐在木椅上，背部挺直，双手自然放在膝盖上，双脚踩地。",
    expected: {
      subject: { category: "person", ageGroup: "adult", genderPresentation: "女性", action: "坐在木椅上" },
      pose: {
        base: "sitting",
        torso: "背部挺直",
        arms: "双手自然放在膝盖上",
        legs: "双脚踩地",
        contactPoints: ["身体由木椅支撑", "双脚接触地面"],
      },
      environment: { props: [{ name: "木椅", placement: "人物身下", prominence: "important" }] },
    },
    deterministicPaths: ["subject", "pose.base", "pose.torso", "pose.arms", "pose.legs", "pose.contactPoints"],
  }),
  fixture({
    id: "pose-lean-wall-right-shoulder",
    dimensions: ["pose", "spatial"],
    parserTier: "deterministic",
    input: "男人站着靠在水泥墙上，右肩贴墙，双臂交叉，目光看向镜头。",
    expected: {
      subject: { category: "person", genderPresentation: "男性", action: "站着靠在水泥墙上" },
      pose: {
        base: "standing",
        gaze: "看向镜头",
        arms: "双臂交叉",
        contactPoints: ["右肩接触水泥墙", "双脚接触地面"],
      },
      environment: { surfaces: ["水泥墙"] },
    },
    deterministicPaths: ["subject", "pose.base", "pose.gaze", "pose.arms", "pose.contactPoints"],
  }),
  fixture({
    id: "pose-crouch-hand-ground",
    dimensions: ["pose", "spatial"],
    parserTier: "deterministic",
    input: "人物蹲在湿地上，左手撑地，右膝抬起，身体略微前倾。",
    expected: {
      subject: { category: "person", action: "蹲在湿地上" },
      pose: {
        base: "crouching",
        torso: "身体略微前倾",
        arms: "左手撑地",
        legs: "右膝抬起",
        contactPoints: ["左手接触地面", "身体由蹲姿支撑"],
      },
    },
    deterministicPaths: ["subject", "pose.base", "pose.torso", "pose.arms", "pose.legs", "pose.contactPoints"],
  }),
  fixture({
    id: "pose-lying-sofa-pillow",
    dimensions: ["pose", "spatial"],
    parserTier: "deterministic",
    input: "成年女性侧躺在旧沙发上，头枕靠垫，左手垂到沙发边缘。",
    expected: {
      subject: { category: "person", ageGroup: "adult", genderPresentation: "女性", action: "侧躺在旧沙发上" },
      pose: {
        base: "lying",
        orientation: "profile",
        arms: "左手垂到沙发边缘",
        contactPoints: ["身体由沙发支撑", "头部由靠垫支撑"],
      },
      environment: { props: [{ name: "旧沙发", prominence: "important" }, { name: "靠垫", placement: "人物头下" }] },
    },
    deterministicPaths: ["subject", "pose.base", "pose.orientation", "pose.arms", "pose.contactPoints"],
  }),
  fixture({
    id: "pose-one-knee-flowerbed",
    dimensions: ["pose", "spatial"],
    parserTier: "deterministic",
    input: "青年男子单膝跪在花坛旁，右膝着地，左脚支撑身体。",
    expected: {
      subject: { category: "person", genderPresentation: "男性", action: "单膝跪在花坛旁" },
      pose: {
        base: "kneeling",
        legs: "右膝着地，左脚支撑身体",
        contactPoints: ["右膝接触地面", "左脚支撑身体"],
      },
      environment: { location: "花坛旁" },
    },
    deterministicPaths: ["subject", "pose.base", "pose.legs", "pose.contactPoints"],
  }),
  fixture({
    id: "pose-walking-left-foot",
    dimensions: ["pose"],
    parserTier: "deterministic",
    input: "模特正在穿过斑马线，左脚向前迈出，右臂自然摆到前方。",
    expected: {
      subject: { category: "person", action: "穿过斑马线" },
      pose: { base: "moving", arms: "右臂自然摆到前方", legs: "左脚向前迈出" },
      environment: { location: "斑马线" },
    },
    deterministicPaths: ["subject", "pose.base", "pose.arms", "pose.legs"],
  }),
  fixture({
    id: "pose-stairs-feet-lower-step",
    dimensions: ["pose", "spatial"],
    parserTier: "deterministic",
    input: "女人坐在楼梯台阶上，双脚踩在下一级台阶，手肘支在膝盖上。",
    expected: {
      subject: { category: "person", genderPresentation: "女性", action: "坐在楼梯台阶上" },
      pose: {
        base: "sitting",
        arms: "手肘支在膝盖上",
        legs: "双脚踩在下一级台阶",
        contactPoints: ["身体由楼梯台阶支撑", "双脚接触下一级台阶", "手肘由膝盖支撑"],
      },
      environment: { architecturalFeatures: ["楼梯台阶"] },
    },
    deterministicPaths: ["subject", "pose.base", "pose.arms", "pose.legs", "pose.contactPoints"],
  }),
  fixture({
    id: "pose-half-crouch-turn-back",
    dimensions: ["pose"],
    parserTier: "hybrid",
    input: "人物半蹲着向右转身，同时回头看向左后方，重心压在后腿。",
    expected: {
      subject: { category: "person", action: "半蹲转身" },
      pose: {
        base: "crouching",
        orientation: "three-quarter",
        gaze: "回头看向左后方",
        torso: "上身向右转动",
        legs: "重心压在后腿",
      },
    },
    deterministicPaths: ["subject.category", "pose.base"],
    llmOnlyPaths: ["subject.action", "pose.orientation", "pose.gaze", "pose.torso", "pose.legs"],
  }),

  fixture({
    id: "camera-35mm-front-full-body",
    dimensions: ["camera", "pose"],
    parserTier: "deterministic",
    input: "35mm 镜头，平视机位，正面全身照，镜头和人物保持中等距离。",
    expected: {
      pose: { orientation: "front" },
      composition: { framing: "full-body", viewDirection: "front" },
      camera: {
        lens: { minFocalLengthMm: 35, maxFocalLengthMm: 35, type: "wide" },
        distance: { scale: "medium" },
        height: "eye-level",
      },
    },
    deterministicPaths: ["pose.orientation", "composition.framing", "camera.lens", "camera.distance", "camera.height"],
  }),
  fixture({
    id: "camera-85mm-closeup-shallow",
    dimensions: ["camera"],
    parserTier: "deterministic",
    input: "用 85mm 长焦拍面部特写，近距离，浅景深，焦点落在双眼。",
    expected: {
      composition: { framing: "close-up" },
      camera: {
        lens: { minFocalLengthMm: 85, maxFocalLengthMm: 85, type: "telephoto" },
        distance: { scale: "near" },
        depthOfField: "shallow",
        focusTarget: "双眼",
      },
    },
    deterministicPaths: ["composition.framing", "camera.lens", "camera.distance", "camera.depthOfField", "camera.focusTarget"],
  }),
  fixture({
    id: "camera-24mm-wide-environment",
    dimensions: ["camera"],
    parserTier: "deterministic",
    input: "24mm 广角环境人像，远景构图，人物只占画面三分之一，保留大量建筑背景。",
    expected: {
      composition: { framing: "wide", subjectPlacement: "rule-of-thirds", background: "保留大量建筑背景" },
      camera: {
        lens: { minFocalLengthMm: 24, maxFocalLengthMm: 24, type: "ultra-wide" },
        distance: { scale: "far" },
        captureStyle: "environmental portrait photography",
      },
      aesthetic: { medium: "photography", genres: ["environmental portrait photography"] },
    },
    deterministicPaths: ["composition.framing", "composition.subjectPlacement", "camera.lens", "camera.distance"],
  }),
  fixture({
    id: "camera-overhead-square",
    dimensions: ["camera"],
    parserTier: "deterministic",
    input: "从正上方俯拍，鸟瞰构图，人物躺在地毯中央，画面比例 1:1。",
    expected: {
      pose: { base: "lying" },
      composition: { orientation: "square", subjectPlacement: "center", viewDirection: "overhead", aspectRatio: { width: 1, height: 1 } },
      camera: { height: "overhead", angle: "正上方鸟瞰俯拍" },
      environment: { props: [{ name: "地毯", placement: "人物身下" }] },
    },
    deterministicPaths: ["pose.base", "composition.orientation", "composition.viewDirection", "composition.aspectRatio", "camera.height", "camera.angle"],
  }),
  fixture({
    id: "camera-low-angle-28mm-full-body",
    dimensions: ["camera"],
    parserTier: "deterministic",
    input: "28mm 广角，低机位仰拍，完整全身构图，人物站在镜头前两米。",
    expected: {
      subject: { category: "person", action: "站在镜头前两米" },
      pose: { base: "standing" },
      composition: { framing: "full-body" },
      camera: {
        lens: { minFocalLengthMm: 28, maxFocalLengthMm: 28, type: "wide" },
        distance: { scale: "medium", description: "镜头距人物约两米" },
        height: "low",
        angle: "仰拍",
      },
    },
    deterministicPaths: ["subject", "pose.base", "composition.framing", "camera.lens", "camera.distance", "camera.height", "camera.angle"],
  }),
  fixture({
    id: "camera-macro-full-body-conflict",
    dimensions: ["camera"],
    parserTier: "deterministic",
    input: "100mm 微距镜头贴近人物拍摄，同时要求完整全身都在画面里。",
    expected: {
      composition: { framing: "full-body" },
      camera: {
        lens: { minFocalLengthMm: 100, maxFocalLengthMm: 100, type: "macro" },
        distance: { scale: "intimate" },
      },
    },
    deterministicPaths: ["composition.framing", "camera.lens", "camera.distance"],
    expectedDoctorCodes: ["camera-distance-framing-conflict", "camera-macro-framing-conflict"],
  }),
  fixture({
    id: "camera-200mm-near-extreme-wide",
    dimensions: ["camera"],
    parserTier: "deterministic",
    input: "使用 200mm 长焦，镜头贴近人物，但要拍出超远景和完整街区。",
    expected: {
      composition: { framing: "extreme-wide", background: "完整街区" },
      camera: {
        lens: { minFocalLengthMm: 200, maxFocalLengthMm: 200, type: "telephoto" },
        distance: { scale: "intimate" },
      },
    },
    deterministicPaths: ["composition.framing", "camera.lens", "camera.distance"],
    expectedDoctorCodes: ["camera-distance-framing-conflict", "camera-telephoto-wide-framing-conflict"],
  }),
  fixture({
    id: "camera-left-rear-over-shoulder",
    dimensions: ["camera", "spatial"],
    parserTier: "hybrid",
    input: "相机位于人物左后侧，越过右肩拍向前方的镜子，镜中能看到人物正脸。",
    expected: {
      pose: { orientation: "back", gaze: "看向前方镜子" },
      composition: { viewDirection: "rear", foreground: "人物右肩", background: "镜中人物正脸" },
      camera: { angle: "人物左后侧的越肩视角", focusTarget: "镜中的人物正脸" },
      environment: { props: [{ name: "镜子", placement: "人物前方", prominence: "important" }] },
    },
    deterministicPaths: [],
    llmOnlyPaths: ["pose.orientation", "composition.foreground", "composition.background", "camera.angle", "camera.focusTarget", "environment.props"],
  }),

  fixture({
    id: "wardrobe-black-top-skirt-boots",
    dimensions: ["wardrobe"],
    parserTier: "deterministic",
    input: "她穿黑色无袖上衣、深灰色半身裙和黑色短靴。",
    expected: {
      subject: { category: "person", genderPresentation: "女性" },
      wardrobe: {
        garments: [
          { category: "top", name: "无袖上衣", color: "黑色", worn: true },
          { category: "bottom", name: "半身裙", color: "深灰色", worn: true },
          { category: "footwear", name: "短靴", color: "黑色", worn: true },
        ],
      },
    },
    deterministicPaths: ["subject", "wardrobe.garments"],
  }),
  fixture({
    id: "wardrobe-red-dress-coat-hand",
    dimensions: ["wardrobe", "spatial"],
    parserTier: "deterministic",
    input: "女人穿红色连衣裙，米色风衣脱下后拿在左手里。",
    expected: {
      subject: { category: "person", genderPresentation: "女性" },
      wardrobe: {
        garments: [
          { category: "dress", name: "连衣裙", color: "红色", worn: true },
          { category: "outerwear", name: "风衣", color: "米色", worn: false, placementWhenNotWorn: "拿在人物左手里" },
        ],
      },
    },
    deterministicPaths: ["subject", "wardrobe.garments"],
  }),
  fixture({
    id: "wardrobe-shoes-off-right-stairs",
    dimensions: ["wardrobe", "spatial"],
    parserTier: "deterministic",
    input: "鞋子已经脱下，整齐放在人物右侧的第二级楼梯上，人物只穿深色袜子。",
    expected: {
      wardrobe: {
        garments: [
          { category: "footwear", name: "鞋子", worn: false, placementWhenNotWorn: "人物右侧的第二级楼梯上" },
          { category: "hosiery", name: "袜子", color: "深色", worn: true },
        ],
      },
      environment: { props: [{ name: "鞋子", placement: "人物右侧的第二级楼梯上", state: "整齐放置", prominence: "important" }] },
    },
    deterministicPaths: ["wardrobe.garments", "environment.props"],
  }),
  fixture({
    id: "wardrobe-half-worn-jacket",
    dimensions: ["wardrobe", "pose"],
    parserTier: "hybrid",
    input: "牛仔夹克只穿了一半，左臂在袖子里，右侧衣袖自然垂下。",
    expected: {
      wardrobe: {
        garments: [{ category: "outerwear", name: "牛仔夹克", material: "牛仔布", fit: "半穿状态", worn: true, details: ["左臂穿入袖子", "右侧衣袖自然垂下"] }],
      },
      pose: { arms: "左臂在夹克袖子里，右臂未穿入衣袖" },
    },
    deterministicPaths: ["wardrobe.garments.0.category", "wardrobe.garments.0.name", "wardrobe.garments.0.material", "wardrobe.garments.0.fit", "wardrobe.garments.0.worn"],
    llmOnlyPaths: ["pose.arms", "wardrobe.garments.0.details"],
  }),
  fixture({
    id: "wardrobe-shirt-sleeves-tie",
    dimensions: ["wardrobe"],
    parserTier: "deterministic",
    input: "成年男性穿白衬衫，袖口卷到手肘，黑色领带略微松开。",
    expected: {
      subject: { category: "person", ageGroup: "adult", genderPresentation: "男性" },
      wardrobe: {
        garments: [
          { category: "top", name: "衬衫", color: "白色", worn: true, details: ["袖口卷到手肘"] },
          { category: "accessory", name: "领带", color: "黑色", worn: true, condition: "略微松开" },
        ],
      },
    },
    deterministicPaths: ["subject", "wardrobe.garments"],
  }),
  fixture({
    id: "wardrobe-hat-on-chair",
    dimensions: ["wardrobe", "spatial"],
    parserTier: "deterministic",
    input: "人物没有戴帽子，棕色礼帽放在身后的椅子上。",
    expected: {
      subject: { category: "person" },
      wardrobe: { garments: [{ category: "accessory", name: "礼帽", color: "棕色", worn: false, placementWhenNotWorn: "人物身后的椅子上" }] },
      environment: { props: [{ name: "礼帽", placement: "人物身后的椅子上" }, { name: "椅子", placement: "人物身后" }] },
    },
    deterministicPaths: ["subject", "wardrobe.garments", "environment.props"],
  }),
  fixture({
    id: "wardrobe-layered-trench-sweater",
    dimensions: ["wardrobe"],
    parserTier: "deterministic",
    input: "灰色高领毛衣穿在卡其色风衣里面，风衣敞开，不要系扣。",
    expected: {
      wardrobe: {
        garments: [
          { category: "top", name: "高领毛衣", color: "灰色", worn: true },
          { category: "outerwear", name: "风衣", color: "卡其色", condition: "敞开", worn: true },
        ],
        layering: ["高领毛衣穿在风衣里面"],
      },
      negativeConstraints: [{ target: "wardrobe.garments", avoid: ["风衣系扣"], severity: "medium" }],
    },
    deterministicPaths: ["wardrobe.garments", "wardrobe.layering", "negativeConstraints"],
  }),
  fixture({
    id: "wardrobe-jacket-worn-chair-conflict",
    dimensions: ["wardrobe", "spatial"],
    parserTier: "deterministic",
    input: "人物穿着黑色夹克，同时这件黑色夹克又搭在旁边椅背上。",
    expected: {
      subject: { category: "person" },
      wardrobe: { garments: [{ category: "outerwear", name: "夹克", color: "黑色", worn: true, placementWhenNotWorn: "旁边椅背上" }] },
      environment: { props: [{ name: "黑色夹克", placement: "旁边椅背上" }] },
    },
    deterministicPaths: ["subject", "wardrobe.garments", "environment.props"],
    expectedDoctorCodes: ["wardrobe-worn-placement-conflict"],
  }),

  fixture({
    id: "lighting-dim-face-natural",
    dimensions: ["lighting"],
    parserTier: "deterministic",
    input: "室内整体昏暗，但人物面部保持正常曝光，使用柔和的环境光。",
    expected: { lighting: { style: "柔和环境光", intensity: "dim", quality: "soft", sources: ["室内环境光"], faceExposure: "natural" } },
    deterministicPaths: ["lighting"],
  }),
  fixture({
    id: "lighting-window-side-soft",
    dimensions: ["lighting"],
    parserTier: "deterministic",
    input: "左侧窗户投来柔和侧光，人物右脸保留轻微阴影，色温中性。",
    expected: { lighting: { style: "窗户柔和侧光", direction: "从画面左侧照向人物", quality: "soft", sources: ["左侧窗户"], colorTemperature: "neutral", contrast: "medium", faceExposure: "natural" } },
    deterministicPaths: ["lighting.direction", "lighting.quality", "lighting.sources", "lighting.colorTemperature"],
  }),
  fixture({
    id: "lighting-hard-backlight-silhouette",
    dimensions: ["lighting"],
    parserTier: "deterministic",
    input: "强烈硬质逆光从人物背后照来，正脸几乎成为剪影，高反差。",
    expected: { lighting: { style: "强烈硬质逆光", intensity: "bright", direction: "人物背后", quality: "hard", contrast: "high", faceExposure: "silhouette" } },
    deterministicPaths: ["lighting.style", "lighting.intensity", "lighting.direction", "lighting.quality", "lighting.contrast", "lighting.faceExposure"],
  }),
  fixture({
    id: "lighting-golden-hour-rim",
    dimensions: ["lighting"],
    parserTier: "deterministic",
    input: "日落黄金时刻，暖色轮廓光勾勒头发边缘，面部由柔和补光照亮。",
    expected: { lighting: { style: "黄金时刻轮廓光与柔和面部补光", direction: "背侧轮廓光", quality: "mixed", sources: ["日落阳光", "面部柔和补光"], colorTemperature: "warm", faceExposure: "natural" }, environment: { timeOfDay: "日落" } },
    deterministicPaths: ["lighting.style", "lighting.sources", "lighting.colorTemperature", "lighting.faceExposure", "environment.timeOfDay"],
  }),
  fixture({
    id: "lighting-cool-neon-mixed",
    dimensions: ["lighting"],
    parserTier: "deterministic",
    input: "雨夜街头，蓝色霓虹从左边照脸，右侧有少量粉红反光，整体冷色混合光。",
    expected: { lighting: { style: "雨夜霓虹混合光", direction: "蓝色主光从左侧，粉红反光从右侧", quality: "mixed", sources: ["蓝色霓虹", "粉红反光"], colorTemperature: "cool", contrast: "high", faceExposure: "natural" }, environment: { settingType: "exterior", location: "雨夜街头", weather: "雨" } },
    deterministicPaths: ["lighting.style", "lighting.direction", "lighting.quality", "lighting.sources", "lighting.colorTemperature"],
  }),
  fixture({
    id: "lighting-stage-spot-complex",
    dimensions: ["lighting", "spatial"],
    parserTier: "hybrid",
    input: "舞台只有一束顶光落在人物身上，背景保持黑暗，面部不能过曝，脚下有清晰椭圆光斑。",
    expected: { lighting: { style: "单束舞台顶光", intensity: "bright", direction: "正上方", quality: "hard", sources: ["舞台聚光灯"], contrast: "high", faceExposure: "natural" }, environment: { settingType: "interior", location: "黑暗舞台", props: [{ name: "椭圆光斑", placement: "人物脚下", prominence: "important" }] }, negativeConstraints: [{ target: "lighting.faceExposure", avoid: ["面部过曝"], severity: "high" }] },
    deterministicPaths: ["lighting.direction", "lighting.quality", "lighting.faceExposure", "negativeConstraints"],
    llmOnlyPaths: ["lighting.style", "environment.props"],
  }),

  fixture({
    id: "spatial-bag-left-shoes-right",
    dimensions: ["spatial", "wardrobe"],
    parserTier: "deterministic",
    input: "手提包放在人物左侧地面，脱下的鞋子却放在人物右侧台阶上。",
    expected: { wardrobe: { garments: [{ category: "footwear", name: "鞋子", worn: false, placementWhenNotWorn: "人物右侧台阶上" }] }, environment: { props: [{ name: "手提包", placement: "人物左侧地面" }, { name: "鞋子", placement: "人物右侧台阶上" }] } },
    deterministicPaths: ["wardrobe.garments", "environment.props"],
  }),
  fixture({
    id: "spatial-shoe-left-right-conflict",
    dimensions: ["spatial", "wardrobe"],
    parserTier: "deterministic",
    input: "鞋子脱下放在人物左边，但环境道具描述里鞋子位于人物右边。",
    expected: { wardrobe: { garments: [{ category: "footwear", name: "鞋子", worn: false, placementWhenNotWorn: "人物左边" }] }, environment: { props: [{ name: "鞋子", placement: "人物右边" }] } },
    deterministicPaths: ["wardrobe.garments", "environment.props"],
    expectedDoctorCodes: ["spatial-placement-conflict"],
  }),
  fixture({
    id: "spatial-subject-left-lamp-right",
    dimensions: ["spatial"],
    parserTier: "deterministic",
    input: "人物位于画面左侧，右后方是一盏落地灯，中间留出大片负空间。",
    expected: { composition: { subjectPlacement: "left", negativeSpace: "人物与右后方落地灯之间的大面积空白" }, environment: { props: [{ name: "落地灯", placement: "画面右后方", prominence: "supporting" }] } },
    deterministicPaths: ["composition.subjectPlacement", "composition.negativeSpace", "environment.props"],
  }),
  fixture({
    id: "spatial-bike-behind-puddle-front",
    dimensions: ["spatial"],
    parserTier: "deterministic",
    input: "自行车停在人物身后，前景有一片水洼，人物和自行车之间隔着半米。",
    expected: { composition: { foreground: "人物前方的水洼", midground: "人物", background: "人物身后的自行车" }, environment: { props: [{ name: "自行车", placement: "人物身后约半米" }, { name: "水洼", placement: "画面前景" }] } },
    deterministicPaths: ["composition.foreground", "composition.background", "environment.props"],
  }),
  fixture({
    id: "spatial-two-people-table-between",
    dimensions: ["spatial", "pose"],
    parserTier: "hybrid",
    input: "两个人隔着餐桌面对面坐着，左边的人看向右边的人，桌上花瓶位于两人正中间。",
    expected: { subject: { category: "person", count: 2, relationships: ["两人隔着餐桌面对面坐着"] }, pose: { base: "sitting", orientation: "mixed", gaze: "左侧人物看向右侧人物" }, composition: { subjectPlacement: "custom", midground: "餐桌和正中间的花瓶" }, environment: { props: [{ name: "餐桌", placement: "两人之间", prominence: "important" }, { name: "花瓶", placement: "餐桌中央" }] } },
    deterministicPaths: ["subject.category", "subject.count", "pose.base"],
    llmOnlyPaths: ["subject.relationships", "pose.orientation", "pose.gaze", "composition.midground", "environment.props"],
  }),

  fixture({
    id: "constraint-no-crop-head-feet",
    dimensions: ["constraints", "camera"],
    parserTier: "deterministic",
    input: "正面全身构图，不要裁掉头顶，不要裁脚，人物必须完整出现在画面里。",
    expected: { pose: { orientation: "front" }, composition: { framing: "full-body", viewDirection: "front", crop: "完整保留头顶到脚部" }, constraints: [{ target: "composition.crop", requirement: "人物必须从头顶到脚部完整入镜", priority: "required" }], negativeConstraints: [{ target: "composition.crop", avoid: ["裁掉头顶", "裁脚"], severity: "high" }] },
    deterministicPaths: ["pose.orientation", "composition.framing", "composition.crop", "constraints", "negativeConstraints"],
  }),
  fixture({
    id: "constraint-lock-identity-change-clothes",
    dimensions: ["constraints", "wardrobe"],
    parserTier: "deterministic",
    input: "保持人物的脸和发型不变，只把衣服换成白色西装。",
    expected: { wardrobe: { style: "白色西装", garments: [{ category: "outerwear", name: "西装", color: "白色", worn: true }] }, constraints: [{ target: "identity.face", requirement: "保持人物的脸不变", priority: "required" }, { target: "identity.hair", requirement: "保持人物的发型不变", priority: "required" }], locks: { identity: true } },
    deterministicPaths: ["wardrobe", "constraints", "locks.identity"],
  }),
  fixture({
    id: "constraint-lock-pose-camera-change-scene",
    dimensions: ["constraints", "pose", "camera"],
    parserTier: "deterministic",
    input: "保持姿势和镜头不变，只把场景换成雨夜便利店门口。",
    expected: { environment: { settingType: "exterior", location: "雨夜便利店门口", weather: "雨", timeOfDay: "夜晚" }, constraints: [{ target: "pose", requirement: "保持姿势不变", priority: "required" }, { target: "camera", requirement: "保持镜头不变", priority: "required" }], locks: { pose: true, camera: true } },
    deterministicPaths: ["environment", "constraints", "locks.pose", "locks.camera"],
  }),
  fixture({
    id: "constraint-no-extra-text-watermark",
    dimensions: ["constraints", "lighting"],
    parserTier: "deterministic",
    input: "不要出现多余人物，不要文字和水印，脸部不要模糊也不要过曝。",
    expected: { negativeConstraints: [{ target: "subject.count", avoid: ["多余人物"], severity: "high" }, { target: "image.text", avoid: ["文字", "水印"], severity: "high" }, { target: "identity.face", avoid: ["脸部模糊", "脸部过曝"], severity: "high" }] },
    deterministicPaths: ["negativeConstraints"],
  }),
  fixture({
    id: "constraint-no-wide-distortion-verticals",
    dimensions: ["constraints", "camera"],
    parserTier: "deterministic",
    input: "使用 24mm 广角，但不要广角畸变，不要透视夸张，保持建筑垂直线笔直。",
    expected: { camera: { lens: { minFocalLengthMm: 24, maxFocalLengthMm: 24, type: "ultra-wide" } }, constraints: [{ target: "environment.architecturalFeatures", requirement: "保持建筑垂直线笔直", priority: "required" }], negativeConstraints: [{ target: "camera.perspective", avoid: ["广角畸变", "透视夸张"], severity: "high" }] },
    deterministicPaths: ["camera.lens", "constraints", "negativeConstraints"],
  }),
  fixture({
    id: "constraint-keep-lighting-no-underexposure",
    dimensions: ["constraints", "lighting"],
    parserTier: "deterministic",
    input: "保持当前光线方向不变，环境可以暗，但不要让人物面部欠曝。",
    expected: { lighting: { intensity: "dim", faceExposure: "natural" }, constraints: [{ target: "lighting.direction", requirement: "保持当前光线方向不变", priority: "required" }], negativeConstraints: [{ target: "lighting.faceExposure", avoid: ["人物面部欠曝"], severity: "high" }], locks: { lighting: true } },
    deterministicPaths: ["lighting", "constraints", "negativeConstraints", "locks.lighting"],
  }),
  fixture({
    id: "direction-profile-gaze-opposite",
    dimensions: ["pose", "spatial"],
    parserTier: "deterministic",
    input: "人物左侧脸对着镜头，身体朝右，但目光明确看向画面左边。",
    expected: { pose: { orientation: "profile", gaze: "看向画面左边", torso: "身体朝右" }, composition: { viewDirection: "side" } },
    deterministicPaths: ["pose.orientation", "pose.gaze", "pose.torso", "composition.viewDirection"],
    expectedDoctorCodes: ["pose-direction-gaze-conflict"],
  }),
  fixture({
    id: "direction-front-view-back-pose",
    dimensions: ["pose", "camera"],
    parserTier: "deterministic",
    input: "镜头从正面拍摄，但人物背对镜头，要求看到完整后背。",
    expected: { pose: { orientation: "back" }, composition: { viewDirection: "front", background: "人物完整后背" } },
    deterministicPaths: ["pose.orientation", "composition.viewDirection"],
    expectedDoctorCodes: ["composition-view-pose-conflict"],
  }),
  fixture({
    id: "pose-standing-chair-support-conflict",
    dimensions: ["pose", "spatial"],
    parserTier: "deterministic",
    input: "人物保持站立，但身体重量完全由椅面支撑，双脚离地。",
    expected: { subject: { category: "person", action: "保持站立" }, pose: { base: "standing", legs: "双脚离地", contactPoints: ["身体重量完全由椅面支撑"] }, environment: { props: [{ name: "椅子", prominence: "important" }] } },
    deterministicPaths: ["subject", "pose.base", "pose.legs", "pose.contactPoints"],
    expectedDoctorCodes: ["pose-support-conflict"],
  }),
  fixture({
    id: "pose-sitting-no-support",
    dimensions: ["pose", "spatial"],
    parserTier: "deterministic",
    input: "人物在空中做坐姿，臀部下方没有椅子、台阶或任何支撑物。",
    expected: { subject: { category: "person", action: "空中坐姿" }, pose: { base: "sitting", contactPoints: ["臀部下方没有任何支撑物"] }, negativeConstraints: [{ target: "environment.props", avoid: ["椅子", "台阶", "支撑物"], severity: "medium" }] },
    deterministicPaths: ["subject", "pose.base", "pose.contactPoints", "negativeConstraints"],
    expectedDoctorCodes: ["pose-support-conflict"],
  }),
  fixture({
    id: "wardrobe-barefoot-shoes-worn-conflict",
    dimensions: ["wardrobe", "pose"],
    parserTier: "deterministic",
    input: "人物赤脚站在地面上，但同时穿着黑色皮鞋。",
    expected: { subject: { category: "person", action: "赤脚站在地面上" }, pose: { base: "standing", legs: "赤脚站在地面上", contactPoints: ["双脚接触地面"] }, wardrobe: { garments: [{ category: "footwear", name: "皮鞋", color: "黑色", worn: true }] } },
    deterministicPaths: ["subject", "pose.base", "pose.legs", "pose.contactPoints", "wardrobe.garments"],
    expectedDoctorCodes: ["wardrobe-barefoot-footwear-conflict"],
  }),
  fixture({
    id: "constraint-lock-wardrobe-remove-coat-conflict",
    dimensions: ["constraints", "wardrobe"],
    parserTier: "deterministic",
    input: "保持服装完全不变，同时把外套脱掉并放在桌上。",
    expected: { wardrobe: { garments: [{ category: "outerwear", name: "外套", worn: false, placementWhenNotWorn: "桌上" }] }, constraints: [{ target: "wardrobe", requirement: "保持服装完全不变", priority: "required" }], locks: { wardrobe: true } },
    deterministicPaths: ["wardrobe.garments", "constraints", "locks.wardrobe"],
    expectedDoctorCodes: ["locked-module-change-conflict"],
  }),
] as const;
