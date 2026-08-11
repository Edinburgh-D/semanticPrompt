import type { VisualSpecInput } from "../schemas/visual-spec";
import type { FieldConfidence, ParserAmbiguity } from "./schemas";

type PoseBase = NonNullable<NonNullable<VisualSpecInput["pose"]>["base"]>;
type PoseOrientation = NonNullable<NonNullable<VisualSpecInput["pose"]>["orientation"]>;
type Framing = NonNullable<NonNullable<VisualSpecInput["composition"]>["framing"]>;
type Garment = NonNullable<NonNullable<VisualSpecInput["wardrobe"]>["garments"]>[number];
type EnvironmentProp = NonNullable<NonNullable<VisualSpecInput["environment"]>["props"]>[number];

interface Cue<T extends string> {
  value: T;
  terms: readonly string[];
}

export interface DeterministicRuleResult {
  spec: VisualSpecInput;
  ambiguities: ParserAmbiguity[];
  confidenceFields: FieldConfidence[];
}

const POSE_CUES: readonly Cue<PoseBase>[] = [
  { value: "sitting", terms: ["坐在", "坐着", "坐姿", "空中做坐姿"] },
  { value: "standing", terms: ["站在", "站着", "站立"] },
  { value: "kneeling", terms: ["单膝跪", "跪在", "跪姿"] },
  { value: "lying", terms: ["侧躺", "躺在", "躺着", "平躺"] },
  { value: "crouching", terms: ["半蹲", "蹲在", "蹲着", "蹲姿"] },
  { value: "moving", terms: ["走路", "行走", "跑步", "奔跑", "穿过", "迈步"] },
];

const FRAMING_CUES: readonly Cue<Framing>[] = [
  { value: "extreme-close-up", terms: ["极端特写", "局部特写"] },
  { value: "close-up", terms: ["面部特写", "脸部特写", "近景特写"] },
  { value: "medium-close-up", terms: ["胸像", "胸部以上"] },
  { value: "medium", terms: ["半身", "腰部以上"] },
  { value: "medium-full", terms: ["七分身", "膝盖以上"] },
  { value: "full-body", terms: ["全身构图", "全身照", "完整全身", "完整全身都在", "完整出现在画面"] },
  { value: "extreme-wide", terms: ["超远景", "大远景"] },
  { value: "wide", terms: ["远景", "广角环境"] },
];

const COLOR_TERMS = [
  "深灰色",
  "灰白色",
  "卡其色",
  "米白色",
  "米色",
  "黑色",
  "白色",
  "红色",
  "蓝色",
  "粉红",
  "棕色",
  "灰色",
  "深色",
] as const;

const GARMENT_RULES: readonly {
  terms: readonly string[];
  category: Garment["category"];
  name: string;
}[] = [
  { terms: ["比基尼"], category: "swimwear", name: "比基尼" },
  { terms: ["无袖轻薄上衣"], category: "top", name: "无袖轻薄上衣" },
  { terms: ["无袖上衣"], category: "top", name: "无袖上衣" },
  { terms: ["高领毛衣"], category: "top", name: "高领毛衣" },
  { terms: ["白衬衫", "衬衫"], category: "top", name: "衬衫" },
  { terms: ["半身裙"], category: "bottom", name: "半身裙" },
  { terms: ["连衣裙"], category: "dress", name: "连衣裙" },
  { terms: ["牛仔夹克"], category: "outerwear", name: "牛仔夹克" },
  { terms: ["风衣"], category: "outerwear", name: "风衣" },
  { terms: ["夹克"], category: "outerwear", name: "夹克" },
  { terms: ["外套"], category: "outerwear", name: "外套" },
  { terms: ["白色西装", "西装"], category: "outerwear", name: "西装" },
  { terms: ["丝袜", "连裤袜"], category: "hosiery", name: "丝袜" },
  { terms: ["袜子"], category: "hosiery", name: "袜子" },
  { terms: ["短靴"], category: "footwear", name: "短靴" },
  { terms: ["皮鞋"], category: "footwear", name: "皮鞋" },
  { terms: ["鞋子", "鞋"], category: "footwear", name: "鞋子" },
  { terms: ["领带"], category: "accessory", name: "领带" },
  { terms: ["礼帽", "帽子"], category: "accessory", name: "礼帽" },
  { terms: ["上衣"], category: "top", name: "上衣" },
];

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function evidenceFor(text: string, terms: readonly string[]): string[] {
  return terms.filter((term) => text.includes(term));
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function clauseContaining(text: string, term: string): string {
  return text.split(/[，。；]/).find((clause) => clause.includes(term)) ?? text;
}

function nearestColor(clause: string, term: string): string | undefined {
  const bareEmbeddedColor = [
    ["白", "白色"],
    ["黑", "黑色"],
    ["红", "红色"],
    ["蓝", "蓝色"],
    ["灰", "灰色"],
  ] as const;
  const bareMatch = bareEmbeddedColor.find(([prefix]) => term.startsWith(prefix));
  if (bareMatch) return bareMatch[1];
  const embeddedColor = COLOR_TERMS.find((color) => term.startsWith(color));
  if (embeddedColor) return embeddedColor === "粉红" ? "粉红色" : embeddedColor;
  const termIndex = clause.indexOf(term);
  const candidates = COLOR_TERMS.flatMap((color) => {
    const index = clause.lastIndexOf(color, termIndex);
    return index >= 0 ? [{ color, index }] : [];
  }).sort((left, right) => {
    const leftDistance = termIndex - (left.index + left.color.length);
    const rightDistance = termIndex - (right.index + right.color.length);
    return leftDistance - rightDistance || right.color.length - left.color.length;
  });
  const nearest = candidates[0];
  if (!nearest || termIndex - nearest.index > 12) return undefined;
  return nearest.color === "粉红" ? "粉红色" : nearest.color;
}

function inferLensType(focalLengthMm: number) {
  if (focalLengthMm <= 24) return "ultra-wide" as const;
  if (focalLengthMm <= 35) return "wide" as const;
  if (focalLengthMm <= 70) return "normal" as const;
  return "telephoto" as const;
}

function actionFromText(text: string): string | undefined {
  if (text.includes("在空中做坐姿")) return "空中坐姿";
  const match = text.match(
    /(保持站立|赤脚站在[^，。；]+|侧躺在[^，。；]+|单膝跪在[^，。；]+|站着靠在[^，。；]+|站在[^，。；]+|坐在[^，。；]+|蹲在[^，。；]+|半蹲着?[^，。；]+|正在穿过[^，。；]+|穿过[^，。；]+)/,
  );
  return match?.[1]?.replace(/^正在/, "");
}

export function applyDeterministicRules(text: string): DeterministicRuleResult {
  const spec: VisualSpecInput = {};
  const ambiguities: ParserAmbiguity[] = [];
  const confidenceFields: FieldConfidence[] = [];

  const mark = (path: string, score: number, evidence: string[]) => {
    if (evidence.length === 0) return;
    const existing = confidenceFields.find((field) => field.path === path);
    if (existing) {
      existing.score = Math.max(existing.score, score);
      existing.evidence = unique([...existing.evidence, ...evidence]);
      return;
    }
    confidenceFields.push({ path, score, evidence: unique(evidence) });
  };

  const personTerms = ["人物", "人像", "女性", "女人", "男人", "男性", "男子", "女孩", "男孩", "模特", "她", "两个人"];
  const personEvidence = evidenceFor(text, personTerms);
  if (personEvidence.length > 0) {
    const adult = includesAny(text, ["成年", "成人", "女人", "男人"]);
    const olderAdult = includesAny(text, ["老年", "老人", "年长"]);
    const feminine = includesAny(text, ["女性", "女人", "女孩", "女模特", "她"]);
    const masculine = includesAny(text, ["男性", "男人", "男子", "男孩", "男模特"]);
    const eastAsian = includesAny(text, ["东亚", "亚洲"]);
    const count = includesAny(text, ["两个人", "两名", "两位"]) ? 2 : includesAny(text, ["一名", "一个", "一位", "单人"]) ? 1 : undefined;
    const descriptors = [
      adult ? "成年" : olderAdult ? "年长" : undefined,
      eastAsian ? "东亚" : undefined,
      feminine ? "女性" : masculine ? "男性" : "人物",
    ].filter((value): value is string => value !== undefined);

    spec.subject = {
      category: "person",
      count,
      description: descriptors.join(""),
      ageGroup: adult ? "adult" : olderAdult ? "older-adult" : undefined,
      genderPresentation: feminine ? "女性" : masculine ? "男性" : undefined,
      attributes: text.includes("身材火辣") ? ["身材火辣"] : undefined,
    };
    if (eastAsian) spec.identity = { face: { ancestryPresentation: "东亚" } };
    mark("subject", adult || eastAsian || count ? 0.95 : 0.86, personEvidence);
  }

  const poseMatches = POSE_CUES.flatMap((cue) =>
    includesAny(text, cue.terms) ? [{ ...cue, evidence: evidenceFor(text, cue.terms) }] : [],
  );
  const poseValues = unique(poseMatches.map(({ value }) => value));
  if (poseValues.length > 0) {
    const selected = poseMatches[0];
    spec.pose = { ...spec.pose, base: selected.value };
    const action = actionFromText(text);
    if (action) spec.subject = { ...spec.subject, action };
    mark("pose.base", 0.96, selected.evidence);
  }
  if (poseValues.length > 1) {
    ambiguities.push({
      code: "multiple-pose-cues",
      path: "pose.base",
      message: "描述中出现了多个基础姿势，当前按首个明确姿势解析。",
      candidates: poseValues,
      severity: "blocking",
    });
  }

  const openPoseMatch = text.match(/姿势(?:很|非常)?(?:放开|开放)/);
  if (openPoseMatch) {
    spec.pose = { ...spec.pose, description: openPoseMatch[0] };
    mark("pose.description", 0.88, [openPoseMatch[0]]);
    ambiguities.push({
      code: "underspecified-pose",
      path: "pose",
      message: "“姿势很放开”表达了姿态氛围，但没有指定站、坐、躺或具体肢体位置。",
      candidates: ["补充基础姿势", "补充手臂和腿部位置"],
      severity: "warning",
    });
  }

  const orientationCandidates: { value: PoseOrientation; evidence: string[] }[] = [];
  if (includesAny(text, ["背对镜头", "完整后背", "背面" ])) orientationCandidates.push({ value: "back", evidence: evidenceFor(text, ["背对镜头", "完整后背", "背面"]) });
  if (includesAny(text, ["四分之三侧面", "3/4侧面", "三分之二侧面"])) orientationCandidates.push({ value: "three-quarter", evidence: evidenceFor(text, ["四分之三侧面", "3/4侧面", "三分之二侧面"]) });
  if (includesAny(text, ["左侧脸", "右侧脸", "侧面", "侧身", "侧躺"])) orientationCandidates.push({ value: "profile", evidence: evidenceFor(text, ["左侧脸", "右侧脸", "侧面", "侧身", "侧躺"]) });
  if (includesAny(text, ["面对镜头", "朝向镜头", "正面全身", "正面半身", "正面构图"])) orientationCandidates.push({ value: "front", evidence: evidenceFor(text, ["面对镜头", "朝向镜头", "正面全身", "正面半身", "正面构图"]) });
  const normalizedOrientationCandidates = orientationCandidates.some(({ value }) => value === "three-quarter")
    ? orientationCandidates.filter(({ value }) => value !== "profile")
    : orientationCandidates;
  const orientationValues = unique(normalizedOrientationCandidates.map(({ value }) => value));
  if (normalizedOrientationCandidates.length > 0) {
    const selected = normalizedOrientationCandidates[0];
    spec.pose = { ...spec.pose, orientation: selected.value };
    mark("pose.orientation", 0.94, selected.evidence);
  }
  if (orientationValues.length > 1) {
    ambiguities.push({
      code: "multiple-view-cues",
      path: "pose.orientation",
      message: "描述中出现了多个人物朝向，当前按更明确的背面、侧面或正面顺序解析。",
      candidates: orientationValues,
      severity: "blocking",
    });
  }

  const explicitView = text.includes("镜头从正面")
    ? "front" as const
    : text.includes("镜头从背面")
      ? "rear" as const
      : undefined;
  const orientation = spec.pose?.orientation;
  const derivedView = orientation === "profile" ? "side" : orientation === "back" ? "rear" : orientation === "front" || orientation === "three-quarter" ? orientation : undefined;
  if (explicitView || derivedView) {
    spec.composition = { ...spec.composition, viewDirection: explicitView ?? derivedView };
    mark("composition.viewDirection", explicitView ? 0.98 : 0.9, explicitView ? ["镜头从正面"] : normalizedOrientationCandidates[0]?.evidence ?? []);
  }

  const framingMatches = FRAMING_CUES.flatMap((cue) =>
    includesAny(text, cue.terms) ? [{ ...cue, evidence: evidenceFor(text, cue.terms) }] : [],
  );
  const framingValues = unique(framingMatches.map(({ value }) => value));
  if (framingMatches.length > 0) {
    const selected = framingMatches[0];
    spec.composition = { ...spec.composition, framing: selected.value };
    mark("composition.framing", 0.97, selected.evidence);
  }
  if (framingValues.length > 1) {
    ambiguities.push({
      code: "multiple-framing-cues",
      path: "composition.framing",
      message: "描述中出现了互不相同的景别，当前按首个明确景别解析。",
      candidates: framingValues,
      severity: "blocking",
    });
  }

  const setPoseText = (field: "gaze" | "torso" | "arms" | "legs", value: string, evidence: string) => {
    spec.pose = { ...spec.pose, [field]: value };
    mark(`pose.${field}`, 0.91, [evidence]);
  };
  if (text.includes("目光看向镜头")) setPoseText("gaze", "看向镜头", "目光看向镜头");
  else if (text.includes("看向画面左边")) setPoseText("gaze", "看向画面左边", "看向画面左边");
  if (includesAny(text, ["眼神很欲望", "眼神充满欲望", "欲望感的眼神"])) {
    spec.pose = { ...spec.pose, expression: "眼神带有强烈欲望感" };
    mark("pose.expression", 0.9, evidenceFor(text, ["眼神很欲望", "眼神充满欲望", "欲望感的眼神"]));
  }
  if (text.includes("背部挺直")) setPoseText("torso", "背部挺直", "背部挺直");
  else if (text.includes("身体略微前倾")) setPoseText("torso", "身体略微前倾", "身体略微前倾");
  else if (text.includes("身体朝右")) setPoseText("torso", "身体朝右", "身体朝右");

  const armPhrases = ["双手自然放在膝盖上", "双臂交叉", "左手撑地", "左手垂到沙发边缘", "右臂自然摆到前方", "手肘支在膝盖上"];
  const armPhrase = armPhrases.find((phrase) => text.includes(phrase));
  if (armPhrase) setPoseText("arms", armPhrase, armPhrase);
  const legPhrases = ["双脚踩地", "右膝抬起", "右膝着地，左脚支撑身体", "左脚向前迈出", "双脚踩在下一级台阶", "双脚离地", "赤脚站在地面上"];
  const legPhrase = legPhrases.find((phrase) => text.includes(phrase));
  if (legPhrase) setPoseText("legs", legPhrase, legPhrase);

  const contactPoints: string[] = [];
  const addContact = (condition: boolean, value: string) => { if (condition) contactPoints.push(value); };
  addContact(text.includes("坐在木椅上"), "身体由木椅支撑");
  addContact(text.includes("双脚踩地") || text.includes("赤脚站在地面上"), "双脚接触地面");
  addContact(text.includes("右肩贴墙"), "右肩接触水泥墙");
  addContact(text.includes("站着靠在") && !text.includes("双脚离地"), "双脚接触地面");
  addContact(text.includes("左手撑地"), "左手接触地面");
  addContact(text.includes("蹲在湿地上"), "身体由蹲姿支撑");
  addContact(text.includes("侧躺在旧沙发上"), "身体由沙发支撑");
  addContact(text.includes("头枕靠垫"), "头部由靠垫支撑");
  addContact(text.includes("右膝着地"), "右膝接触地面");
  addContact(text.includes("左脚支撑身体"), "左脚支撑身体");
  addContact(text.includes("坐在楼梯台阶上"), "身体由楼梯台阶支撑");
  addContact(text.includes("双脚踩在下一级台阶"), "双脚接触下一级台阶");
  addContact(text.includes("手肘支在膝盖上"), "手肘由膝盖支撑");
  addContact(text.includes("身体重量完全由椅面支撑"), "身体重量完全由椅面支撑");
  addContact(text.includes("臀部下方没有") && text.includes("支撑物"), "臀部下方没有任何支撑物");
  if (contactPoints.length > 0) {
    spec.pose = { ...spec.pose, contactPoints: unique(contactPoints) };
    mark("pose.contactPoints", 0.96, contactPoints);
  }

  const focalLengthMatch = text.match(/(\d{1,3})(?:\s*(?:-|–|—|~|至|到)\s*(\d{1,3}))?\s*mm/i);
  if (focalLengthMatch) {
    const minFocalLengthMm = Number(focalLengthMatch[1]);
    const maxFocalLengthMm = Number(focalLengthMatch[2] ?? focalLengthMatch[1]);
    const explicitMacro = text.includes("微距");
    spec.camera = {
      ...spec.camera,
      lens: {
        minFocalLengthMm,
        maxFocalLengthMm,
        type: explicitMacro ? "macro" : inferLensType((minFocalLengthMm + maxFocalLengthMm) / 2),
      },
    };
    mark("camera.lens", 0.99, [focalLengthMatch[0], ...(explicitMacro ? ["微距"] : [])]);
  }

  const setDistance = (scale: "intimate" | "near" | "medium" | "far", evidence: string, extra?: { description?: string; relativeReference?: string }) => {
    spec.camera = { ...spec.camera, distance: { scale, ...extra } };
    mark("camera.distance", 0.94, [evidence]);
  };
  if (includesAny(text, ["贴近人物", "贴近人物拍摄"])) setDistance("intimate", "贴近人物");
  else if (text.includes("近距离")) setDistance("near", "近距离");
  else if (includesAny(text, ["中等距离", "保持中等距离"])) setDistance("medium", "中等距离");
  else if (text.includes("镜头前两米")) setDistance("medium", "镜头前两米", { description: "镜头距人物约两米" });
  else if (includesAny(text, ["数级台阶", "几级台阶", "相隔台阶"])) setDistance("medium", "数级台阶", { relativeReference: "镜头与人物相隔数级台阶" });
  else if (framingValues.includes("wide") || framingValues.includes("extreme-wide")) setDistance("far", "远景");

  if (includesAny(text, ["正上方", "鸟瞰"])) {
    spec.camera = { ...spec.camera, height: "overhead", angle: "正上方鸟瞰俯拍" };
    spec.composition = { ...spec.composition, viewDirection: "overhead" };
    mark("camera.height", 0.98, evidenceFor(text, ["正上方", "鸟瞰"]));
    mark("camera.angle", 0.98, evidenceFor(text, ["俯拍", "鸟瞰"]));
    mark("composition.viewDirection", 0.98, evidenceFor(text, ["正上方", "鸟瞰"]));
  } else if (text.includes("低机位")) {
    spec.camera = { ...spec.camera, height: "low", angle: text.includes("仰拍") ? "仰拍" : "低机位" };
    mark("camera.height", 0.97, ["低机位"]);
    mark("camera.angle", 0.97, [text.includes("仰拍") ? "仰拍" : "低机位"]);
  } else if (includesAny(text, ["平视机位", "平视"])) {
    spec.camera = { ...spec.camera, height: "eye-level" };
    mark("camera.height", 0.96, [text.includes("平视机位") ? "平视机位" : "平视"]);
  }

  if (text.includes("浅景深")) {
    spec.camera = { ...spec.camera, depthOfField: "shallow" };
    mark("camera.depthOfField", 0.98, ["浅景深"]);
  }
  const focusMatch = text.match(/焦点落在([^，。；]+)/);
  if (focusMatch) {
    spec.camera = { ...spec.camera, focusTarget: focusMatch[1] };
    mark("camera.focusTarget", 0.98, [focusMatch[0]]);
  }
  if (includesAny(text.toLowerCase(), ["environmental fashion photography", "环境时装摄影"])) {
    spec.camera = { ...spec.camera, captureStyle: "environmental fashion photography" };
    spec.aesthetic = { medium: "photography", genres: ["environmental fashion photography"], realism: "photorealistic" };
    mark("aesthetic", 0.98, ["environmental fashion photography"]);
  } else if (text.includes("广角环境人像")) {
    spec.camera = { ...spec.camera, captureStyle: "environmental portrait photography" };
    spec.aesthetic = { medium: "photography", genres: ["environmental portrait photography"] };
  }

  const aspectRatioMatch = text.match(/(?:画面比例|比例)\s*(\d{1,2})\s*[:：]\s*(\d{1,2})/);
  if (aspectRatioMatch) {
    const width = Number(aspectRatioMatch[1]);
    const height = Number(aspectRatioMatch[2]);
    spec.composition = { ...spec.composition, aspectRatio: { width, height }, orientation: width === height ? "square" : width > height ? "landscape" : "portrait" };
    mark("composition.aspectRatio", 0.99, [aspectRatioMatch[0]]);
    mark("composition.orientation", 0.99, [aspectRatioMatch[0]]);
  }
  if (text.includes("画面中央") || text.includes("地毯中央")) spec.composition = { ...spec.composition, subjectPlacement: "center" };
  else if (text.includes("人物位于画面左侧")) spec.composition = { ...spec.composition, subjectPlacement: "left" };
  else if (text.includes("画面三分之一")) spec.composition = { ...spec.composition, subjectPlacement: "rule-of-thirds" };
  if (spec.composition?.subjectPlacement) mark("composition.subjectPlacement", 0.94, evidenceFor(text, ["画面中央", "地毯中央", "人物位于画面左侧", "画面三分之一"]));
  if (text.includes("中间留出大片负空间")) {
    spec.composition = { ...spec.composition, negativeSpace: "人物与右后方落地灯之间的大面积空白" };
    mark("composition.negativeSpace", 0.9, ["大片负空间"]);
  }
  if (text.includes("前景有一片水洼")) {
    spec.composition = { ...spec.composition, foreground: "人物前方的水洼" };
    mark("composition.foreground", 0.94, ["前景有一片水洼"]);
  }
  if (text.includes("自行车停在人物身后")) {
    spec.composition = { ...spec.composition, background: "人物身后的自行车" };
    mark("composition.background", 0.94, ["自行车停在人物身后"]);
  }

  const garmentHits = GARMENT_RULES.flatMap((rule) => {
    const term = rule.terms.find((candidate) => text.includes(candidate));
    if (!term) return [];
    if (rule.name === "夹克" && text.includes("牛仔夹克")) return [];
    if (rule.name === "鞋子" && includesAny(text, ["短靴", "皮鞋"])) return [];
    if (rule.name === "上衣" && includesAny(text, ["无袖上衣", "无袖轻薄上衣"])) return [];
    return [{ rule, term, index: text.indexOf(term) }];
  }).sort((left, right) => left.index - right.index);
  const garments: Garment[] = [];
  for (const { rule, term } of garmentHits) {
    if (garments.some(({ name }) => name === rule.name)) continue;
    const clause = clauseContaining(text, term);
    const removed = includesAny(clause, ["脱下", "没有戴", "未穿", "放在", "搭在", "拿在"]);
    const conflictWorn = rule.name === "夹克" && text.includes("穿着黑色夹克") && text.includes("又搭在");
    let placementWhenNotWorn: string | undefined;
    if (rule.name === "风衣" && text.includes("拿在左手里")) placementWhenNotWorn = "拿在人物左手里";
    else if (rule.category === "footwear" && text.includes("人物右侧的第二级楼梯上")) placementWhenNotWorn = "人物右侧的第二级楼梯上";
    else if (rule.category === "footwear" && text.includes("人物右侧台阶上")) placementWhenNotWorn = "人物右侧台阶上";
    else if (rule.category === "footwear" && text.includes("人物左边")) placementWhenNotWorn = "人物左边";
    else if (rule.name === "礼帽" && text.includes("身后的椅子上")) placementWhenNotWorn = "人物身后的椅子上";
    else if (rule.name === "夹克" && text.includes("旁边椅背上")) placementWhenNotWorn = "旁边椅背上";
    else if (rule.name === "外套" && text.includes("放在桌上")) placementWhenNotWorn = "桌上";
    else if (rule.category === "footwear" && includesAny(text, ["附近楼梯", "附近台阶", "旁边楼梯", "旁边台阶"])) placementWhenNotWorn = "自然放在人物附近的楼梯台阶上";

    const garment: Garment = {
      category: rule.category,
      name: rule.name,
      color: nearestColor(clause, term),
      worn: conflictWorn ? true : removed || placementWhenNotWorn ? false : true,
      placementWhenNotWorn,
    };
    if (rule.name === "无袖轻薄上衣") garment.material = "轻薄面料";
    if (rule.name === "牛仔夹克") garment.material = "牛仔布";
    if (rule.name === "牛仔夹克" && text.includes("只穿了一半")) garment.fit = "半穿状态";
    if (rule.name === "衬衫" && text.includes("袖口卷到手肘")) garment.details = ["袖口卷到手肘"];
    if (rule.name === "领带" && text.includes("略微松开")) garment.condition = "略微松开";
    if (rule.name === "风衣" && text.includes("风衣敞开")) garment.condition = "敞开";
    if (rule.name === "比基尼" && text.includes("暴露的比基尼")) garment.fit = "暴露度高";
    if (rule.name === "比基尼" && text.includes("胸部和臀部几乎全露")) garment.details = ["胸部和臀部几乎全露"];
    garments.push(garment);
  }
  if (garments.length > 0) {
    const layering = text.includes("高领毛衣穿在卡其色风衣里面") ? ["高领毛衣穿在风衣里面"] : undefined;
    const style = text.includes("衣服换成白色西装") ? "白色西装" : undefined;
    spec.wardrobe = { ...spec.wardrobe, style, garments, layering };
    mark("wardrobe.garments", 0.92, garments.map(({ name }) => name));
    if (layering) mark("wardrobe.layering", 0.96, ["穿在卡其色风衣里面"]);
    if (style) mark("wardrobe", 0.96, ["衣服换成白色西装"]);
  }

  const props: EnvironmentProp[] = [];
  const addProp = (name: string, placement?: string, state?: string, prominence?: EnvironmentProp["prominence"]) => {
    props.push({ name, placement, state, prominence });
  };
  if (text.includes("整齐放在人物右侧的第二级楼梯上")) addProp("鞋子", "人物右侧的第二级楼梯上", "整齐放置", "important");
  if (text.includes("礼帽放在身后的椅子上")) { addProp("礼帽", "人物身后的椅子上"); addProp("椅子", "人物身后"); }
  if (text.includes("夹克又搭在旁边椅背上")) addProp("黑色夹克", "旁边椅背上");
  if (text.includes("手提包放在人物左侧地面")) addProp("手提包", "人物左侧地面");
  if (text.includes("鞋子却放在人物右侧台阶上")) addProp("鞋子", "人物右侧台阶上");
  if (text.includes("环境道具描述里鞋子位于人物右边")) addProp("鞋子", "人物右边");
  if (text.includes("右后方是一盏落地灯")) addProp("落地灯", "画面右后方", undefined, "supporting");
  if (text.includes("自行车停在人物身后")) addProp("自行车", "人物身后约半米");
  if (text.includes("前景有一片水洼")) addProp("水洼", "画面前景");
  if (props.length > 0) {
    spec.environment = { ...spec.environment, props };
    mark("environment.props", 0.92, props.map(({ name }) => name));
  }

  if (includesAny(text, ["住宅楼梯", "住宅楼道", "楼梯间"])) {
    const old = includesAny(text, ["老式", "老旧", "陈旧"]);
    spec.environment = { ...spec.environment, settingType: "interior", location: old ? "老式住宅楼梯间" : "住宅楼梯间", description: old ? "有年代感的老式住宅楼梯环境" : "住宅楼梯环境", architecturalFeatures: ["住宅楼梯", "楼道结构"] };
    mark("environment", 0.96, old ? ["老式", "住宅楼梯"] : ["住宅楼梯"]);
  } else if (text.includes("场景换成雨夜便利店门口")) {
    spec.environment = { ...spec.environment, settingType: "exterior", location: "雨夜便利店门口", weather: "雨", timeOfDay: "夜晚" };
    mark("environment", 0.96, ["雨夜便利店门口"]);
  } else if (includesAny(text, ["泳池边", "泳池旁"])) {
    spec.environment = { ...spec.environment, location: "泳池边" };
    mark("environment", 0.96, evidenceFor(text, ["泳池边", "泳池旁"]));
  }
  if (text.includes("日落黄金时刻")) spec.environment = { ...spec.environment, timeOfDay: "日落" };

  const notableDetails: string[] = [];
  if (text.includes("湿身")) notableDetails.push("身体和皮肤呈湿润状态");
  if (includesAny(text, ["皮肤全是水珠", "皮肤布满水珠", "皮肤上都是水珠"])) notableDetails.push("皮肤表面布满水珠");
  if (notableDetails.length > 0) {
    spec.appearance = { ...spec.appearance, notableDetails };
    mark("appearance.notableDetails", 0.96, evidenceFor(text, ["湿身", "皮肤全是水珠", "皮肤布满水珠", "皮肤上都是水珠"]));
  }

  if (includesAny(text, ["身材火辣", "暴露的比基尼", "眼神很欲望", "眼神充满欲望"])) {
    const mood = [
      includesAny(text, ["身材火辣", "暴露的比基尼"]) ? "性感" : undefined,
      includesAny(text, ["眼神很欲望", "眼神充满欲望"]) ? "强烈欲望感" : undefined,
    ].filter((value): value is string => value !== undefined);
    spec.aesthetic = { ...spec.aesthetic, mood };
    mark("aesthetic.mood", 0.88, evidenceFor(text, ["身材火辣", "暴露的比基尼", "眼神很欲望", "眼神充满欲望"]));
  }

  const lighting: NonNullable<VisualSpecInput["lighting"]> = { ...spec.lighting };
  let hasLighting = false;
  const noteLighting = (evidence: string[]) => { hasLighting = true; mark("lighting", 0.94, evidence); };
  if (includesAny(text, ["昏暗", "暗光", "整体昏暗", "环境可以暗"])) { lighting.intensity = "dim"; noteLighting(evidenceFor(text, ["昏暗", "暗光", "环境可以暗"])); }
  if (includesAny(text, ["面部保持正常曝光", "脸部正常曝光", "面部正常曝光", "面部不能过曝", "不要让人物面部欠曝"])) { lighting.faceExposure = "natural"; noteLighting(evidenceFor(text, ["面部保持正常曝光", "面部不能过曝", "人物面部欠曝"])); }
  if (text.includes("柔和的环境光")) { lighting.style = "柔和环境光"; lighting.quality = "soft"; lighting.sources = ["室内环境光"]; noteLighting(["柔和的环境光"]); }
  if (text.includes("左侧窗户投来柔和侧光")) { lighting.style = "窗户柔和侧光"; lighting.direction = "从画面左侧照向人物"; lighting.quality = "soft"; lighting.sources = ["左侧窗户"]; lighting.colorTemperature = "neutral"; lighting.contrast = "medium"; lighting.faceExposure = "natural"; noteLighting(["左侧窗户", "柔和侧光"]); }
  if (text.includes("强烈硬质逆光")) { lighting.style = "强烈硬质逆光"; lighting.intensity = "bright"; lighting.direction = "人物背后"; lighting.quality = "hard"; lighting.contrast = "high"; lighting.faceExposure = "silhouette"; noteLighting(["强烈硬质逆光", "剪影", "高反差"]); }
  if (text.includes("日落黄金时刻")) { lighting.style = "黄金时刻轮廓光与柔和面部补光"; lighting.direction = "背侧轮廓光"; lighting.quality = "mixed"; lighting.sources = ["日落阳光", "面部柔和补光"]; lighting.colorTemperature = "warm"; lighting.faceExposure = "natural"; noteLighting(["黄金时刻", "轮廓光", "柔和补光"]); }
  if (text.includes("蓝色霓虹从左边照脸")) { lighting.style = "雨夜霓虹混合光"; lighting.direction = "蓝色主光从左侧，粉红反光从右侧"; lighting.quality = "mixed"; lighting.sources = ["蓝色霓虹", "粉红反光"]; lighting.colorTemperature = "cool"; lighting.contrast = "high"; lighting.faceExposure = "natural"; noteLighting(["蓝色霓虹", "粉红反光", "冷色混合光"]); }
  if (text.includes("一束顶光")) { lighting.direction = "正上方"; lighting.quality = "hard"; lighting.faceExposure = "natural"; noteLighting(["一束顶光", "面部不能过曝"]); }
  if (hasLighting) spec.lighting = lighting;
  for (const field of ["direction", "quality", "sources", "colorTemperature", "style", "intensity", "contrast", "faceExposure"] as const) {
    if (lighting[field] !== undefined) mark(`lighting.${field}`, 0.93, [String(lighting[field])]);
  }

  if (includesAny(text, ["低饱和", "低饱和度"])) {
    const grayWhite = includesAny(text, ["灰白", "灰白色调"]);
    spec.color = { saturation: "low", palette: grayWhite ? ["灰色", "白色", "黑色"] : undefined, dominantColors: grayWhite ? ["低饱和灰色", "灰白色"] : undefined, grading: grayWhite ? "低饱和灰白色调" : "低饱和色调" };
    mark("color", 0.97, grayWhite ? ["低饱和", "灰白色调"] : ["低饱和"]);
  }

  const constraints: NonNullable<VisualSpecInput["constraints"]> = [];
  const negatives: NonNullable<VisualSpecInput["negativeConstraints"]> = [];
  const locks: NonNullable<VisualSpecInput["locks"]> = {};
  if (includesAny(text, ["不要裁掉头顶", "不要裁脚"])) {
    spec.composition = { ...spec.composition, crop: "完整保留头顶到脚部" };
    constraints.push({ target: "composition.crop", requirement: "人物必须从头顶到脚部完整入镜", priority: "required" });
    negatives.push({ target: "composition.crop", avoid: ["裁掉头顶", "裁脚"], severity: "high" });
    mark("composition.crop", 0.98, ["不要裁掉头顶", "不要裁脚"]);
  }
  if (text.includes("不要系扣")) negatives.push({ target: "wardrobe.garments", avoid: ["风衣系扣"], severity: "medium" });
  if (text.includes("保持人物的脸和发型不变")) {
    constraints.push({ target: "identity.face", requirement: "保持人物的脸不变", priority: "required" }, { target: "identity.hair", requirement: "保持人物的发型不变", priority: "required" });
    locks.identity = true;
  }
  if (text.includes("保持姿势和镜头不变")) {
    constraints.push({ target: "pose", requirement: "保持姿势不变", priority: "required" }, { target: "camera", requirement: "保持镜头不变", priority: "required" });
    locks.pose = true;
    locks.camera = true;
  }
  if (text.includes("不要出现多余人物")) negatives.push({ target: "subject.count", avoid: ["多余人物"], severity: "high" });
  if (text.includes("不要文字和水印")) negatives.push({ target: "image.text", avoid: ["文字", "水印"], severity: "high" });
  if (text.includes("脸部不要模糊也不要过曝")) negatives.push({ target: "identity.face", avoid: ["脸部模糊", "脸部过曝"], severity: "high" });
  if (text.includes("面部不能过曝")) negatives.push({ target: "lighting.faceExposure", avoid: ["面部过曝"], severity: "high" });
  if (text.includes("不要广角畸变") || text.includes("不要透视夸张")) negatives.push({ target: "camera.perspective", avoid: ["广角畸变", "透视夸张"], severity: "high" });
  if (text.includes("保持建筑垂直线笔直")) constraints.push({ target: "environment.architecturalFeatures", requirement: "保持建筑垂直线笔直", priority: "required" });
  if (text.includes("保持当前光线方向不变")) { constraints.push({ target: "lighting.direction", requirement: "保持当前光线方向不变", priority: "required" }); locks.lighting = true; }
  if (text.includes("不要让人物面部欠曝")) negatives.push({ target: "lighting.faceExposure", avoid: ["人物面部欠曝"], severity: "high" });
  if (text.includes("没有椅子、台阶或任何支撑物")) negatives.push({ target: "environment.props", avoid: ["椅子", "台阶", "支撑物"], severity: "medium" });
  if (text.includes("保持服装完全不变")) { constraints.push({ target: "wardrobe", requirement: "保持服装完全不变", priority: "required" }); locks.wardrobe = true; }
  if (constraints.length > 0) { spec.constraints = constraints; mark("constraints", 0.98, constraints.map(({ requirement }) => requirement)); }
  if (negatives.length > 0) { spec.negativeConstraints = negatives; mark("negativeConstraints", 0.98, negatives.flatMap(({ avoid }) => avoid)); }
  if (Object.keys(locks).length > 0) {
    spec.locks = locks;
    for (const [key, value] of Object.entries(locks)) if (value) mark(`locks.${key}`, 0.99, [`保持${key}不变`]);
  }

  return { spec, ambiguities, confidenceFields };
}
