import { VisualSpecSchema, type VisualSpec } from "../schemas/visual-spec";
import {
  DoctorResultSchema,
  type DoctorDiagnostic,
  type DoctorResult,
} from "./schemas";

function includesAny(value: string | undefined, terms: readonly string[]): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function expectedLensType(focalLengthMm: number) {
  if (focalLengthMm <= 24) return "ultra-wide" as const;
  if (focalLengthMm <= 35) return "wide" as const;
  if (focalLengthMm <= 70) return "normal" as const;
  return "telephoto" as const;
}

function oppositeSide(value: string | undefined): "left" | "right" | undefined {
  if (includesAny(value, ["左侧", "左边", "朝左", "向左", "left"])) return "left";
  if (includesAny(value, ["右侧", "右边", "朝右", "向右", "right"])) return "right";
  return undefined;
}

function sameItemName(left: string, right: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[\s的]/g, "");
  const a = normalize(left);
  const b = normalize(right);
  return a === b || a.includes(b) || b.includes(a);
}

function diagnoseCamera(spec: VisualSpec, diagnostics: DoctorDiagnostic[]) {
  const lens = spec.camera?.lens;
  if (
    lens?.type &&
    lens.type !== "macro" &&
    lens.type !== "other" &&
    (lens.minFocalLengthMm !== undefined || lens.maxFocalLengthMm !== undefined)
  ) {
    const min = lens.minFocalLengthMm ?? lens.maxFocalLengthMm;
    const max = lens.maxFocalLengthMm ?? lens.minFocalLengthMm;
    if (min !== undefined && max !== undefined) {
      const expected = expectedLensType((min + max) / 2);
      if (expected !== lens.type) {
        diagnostics.push({
          code: "camera-lens-type-mismatch",
          level: "warning",
          category: "camera",
          paths: ["camera.lens.type", "camera.lens.minFocalLengthMm", "camera.lens.maxFocalLengthMm"],
          message: `焦段 ${min}–${max}mm 与镜头类型 ${lens.type} 不一致。`,
          suggestion: `将镜头类型改为 ${expected}，或调整焦段以匹配 ${lens.type}。`,
        });
      }
    }
  }

  const distance = spec.camera?.distance?.scale;
  const framing = spec.composition?.framing;
  const nearDistance = distance === "intimate" || distance === "near";
  const broadFraming = framing === "full-body" || framing === "wide" || framing === "extreme-wide";
  const farDistance = distance === "far" || distance === "very-far";
  const tightFraming =
    framing === "extreme-close-up" || framing === "close-up" || framing === "medium-close-up";
  if ((nearDistance && broadFraming) || (farDistance && tightFraming)) {
    diagnostics.push({
      code: "camera-distance-framing-conflict",
      level: "error",
      category: "camera",
      paths: ["camera.distance.scale", "composition.framing"],
      message: `镜头距离 ${distance} 与景别 ${framing} 难以同时成立。`,
      suggestion: "增大或缩短拍摄距离，或者选择与当前距离匹配的景别。",
    });
  }

  if (
    lens?.type === "macro" &&
    (framing === "full-body" || framing === "wide" || framing === "extreme-wide")
  ) {
    diagnostics.push({
      code: "camera-macro-framing-conflict",
      level: "error",
      category: "camera",
      paths: ["camera.lens.type", "composition.framing"],
      message: `微距镜头与 ${framing} 景别难以表达同一个明确拍摄意图。`,
      suggestion: "微距镜头用于局部细节；若需要完整人物或环境，请改用普通镜头并增加拍摄距离。",
    });
  }

  const maxFocalLength = lens?.maxFocalLengthMm ?? lens?.minFocalLengthMm;
  if (
    lens?.type === "telephoto" &&
    maxFocalLength !== undefined &&
    maxFocalLength >= 135 &&
    (framing === "wide" || framing === "extreme-wide")
  ) {
    diagnostics.push({
      code: "camera-telephoto-wide-framing-conflict",
      level: "warning",
      category: "camera",
      paths: ["camera.lens", "composition.framing", "camera.distance"],
      message: `${maxFocalLength}mm 长焦与 ${framing} 环境景别组合会强烈压缩空间，并需要很远的机位。`,
      suggestion: "若要保留完整环境，请换用更短焦段；若要长焦压缩感，请明确 far 或 very-far 拍摄距离。",
    });
  }
}

function diagnoseComposition(spec: VisualSpec, diagnostics: DoctorDiagnostic[]) {
  const framing = spec.composition?.framing;
  const crop = spec.composition?.crop;
  const fullBodyCropConflict =
    framing === "full-body" &&
    includesAny(crop, ["腰部以上", "半身", "膝盖以上", "胸部以上", "裁掉脚", "不含脚"]);
  const closeCropConflict =
    (framing === "close-up" || framing === "extreme-close-up") &&
    includesAny(crop, ["完整全身", "保留全身", "包含脚部"]);
  if (fullBodyCropConflict || closeCropConflict) {
    diagnostics.push({
      code: "composition-crop-framing-conflict",
      level: "error",
      category: "composition",
      paths: ["composition.framing", "composition.crop"],
      message: `景别 ${framing} 与裁切要求“${crop}”互相冲突。`,
      suggestion: "统一景别和裁切边界；全身构图应保留头部至脚部，特写则应明确局部范围。",
    });
  }

  const view = spec.composition?.viewDirection;
  const pose = spec.pose?.orientation;
  const viewPoseConflict =
    (view === "front" && pose === "back") ||
    (view === "rear" && pose === "front") ||
    (view === "side" && pose === "front") ||
    (view === "front" && pose === "profile");
  if (viewPoseConflict) {
    diagnostics.push({
      code: "composition-view-pose-conflict",
      level: "error",
      category: "composition",
      paths: ["composition.viewDirection", "pose.orientation"],
      message: `镜头观看方向 ${view} 与人物朝向 ${pose} 不一致。`,
      suggestion: "选择一致的镜头观看方向和人物朝向，或明确使用越肩、回头等特殊关系。",
    });
  }

  if (framing === "full-body" && !spec.camera?.distance) {
    diagnostics.push({
      code: "composition-camera-distance-unspecified",
      level: "suggestion",
      category: "composition",
      paths: ["composition.framing", "camera.distance"],
      message: "全身构图没有指定镜头距离，主体占画面比例可能不稳定。",
      suggestion: "补充 near、medium 或具体的相对距离，并确保人物从头到脚完整入镜。",
    });
  }
}

function diagnosePose(spec: VisualSpec, diagnostics: DoctorDiagnostic[]) {
  const action = spec.subject?.action;
  const base = spec.pose?.base;
  const actionPoseConflict =
    (base === "sitting" && includesAny(action, ["站立", "站着", "奔跑", "跑步"])) ||
    (base === "standing" && includesAny(action, ["坐着", "坐在", "躺着", "躺在"])) ||
    (base === "lying" && includesAny(action, ["站立", "站着", "坐着", "行走", "奔跑"]));
  if (actionPoseConflict) {
    diagnostics.push({
      code: "pose-action-conflict",
      level: "error",
      category: "pose",
      paths: ["subject.action", "pose.base"],
      message: `主体动作“${action}”与基础姿势 ${base} 冲突。`,
      suggestion: "保留一个明确的基础姿势，并让主体动作与该姿势一致。",
    });
  }

  const limbText = [spec.pose?.arms, spec.pose?.legs].filter(Boolean).join("；");
  const limbConflict =
    (base === "sitting" && includesAny(limbText, ["奔跑", "跑动", "双腿站直"])) ||
    (base === "standing" && includesAny(limbText, ["盘腿坐", "跪地"]));
  if (limbConflict) {
    diagnostics.push({
      code: "pose-limb-action-conflict",
      level: "warning",
      category: "pose",
      paths: ["pose.base", "pose.arms", "pose.legs"],
      message: `基础姿势 ${base} 与肢体描述“${limbText}”不一致。`,
      suggestion: "重写肢体位置，使双臂和双腿能够在指定基础姿势中自然成立。",
    });
  }


  const contactText = spec.pose?.contactPoints?.join("；") ?? "";
  const noSupport = includesAny(contactText, ["没有任何支撑", "没有支撑物", "无支撑"]);
  const chairCarriesStandingBody =
    base === "standing" &&
    includesAny(contactText, ["重量完全由椅面支撑", "身体由椅子支撑"]) &&
    includesAny(spec.pose?.legs, ["双脚离地", "脚离地"]);
  if ((base === "sitting" && noSupport) || chairCarriesStandingBody) {
    diagnostics.push({
      code: "pose-support-conflict",
      level: "error",
      category: "pose",
      paths: ["pose.base", "pose.legs", "pose.contactPoints"],
      message: `基础姿势 ${base} 与承重或接触关系无法同时成立。`,
      suggestion: "明确身体由哪个表面支撑；若人物悬空，请把姿势描述为跳跃、漂浮或由装置悬挂。",
    });
  } else if (
    (base === "sitting" || base === "kneeling" || base === "lying") &&
    (spec.pose?.contactPoints?.length ?? 0) === 0
  ) {
    diagnostics.push({
      code: "pose-support-unspecified",
      level: "suggestion",
      category: "pose",
      paths: ["pose.base", "pose.contactPoints"],
      message: `${base} 姿势没有说明身体与环境的支撑或接触点。`,
      suggestion: "补充臀部、膝盖、背部、手掌或脚部接触的表面，让姿势和空间关系更稳定。",
    });
  }

  const torsoSide = oppositeSide(spec.pose?.torso);
  const gazeSide = oppositeSide(spec.pose?.gaze);
  if (spec.pose?.orientation === "profile" && torsoSide && gazeSide && torsoSide !== gazeSide) {
    diagnostics.push({
      code: "pose-direction-gaze-conflict",
      level: "warning",
      category: "pose",
      paths: ["pose.orientation", "pose.torso", "pose.gaze"],
      message: "侧面姿势中的身体朝向与目光左右方向相反，可能存在坐标系歧义。",
      suggestion: "说明左右是以人物自身还是画面为准，或明确人物正在回头反向看。",
    });
  }
}

function diagnoseSpatialAndWardrobe(spec: VisualSpec, diagnostics: DoctorDiagnostic[]) {
  const garments = spec.wardrobe?.garments ?? [];
  const props = spec.environment?.props ?? [];

  garments.forEach((garment, index) => {
    const garmentPath = `wardrobe.garments.${index}`;
    if (garment.worn === false && !garment.placementWhenNotWorn) {
      diagnostics.push({
        code: "spatial-unplaced-item",
        level: "warning",
        category: "spatial",
        paths: [`${garmentPath}.worn`, `${garmentPath}.placementWhenNotWorn`],
        message: `${garment.name}被标记为未穿戴，但没有指定它在画面中的位置。`,
        suggestion: `补充${garment.name}放在人物哪一侧、哪个表面或是否应移出画面。`,
      });
    }

    if (garment.worn === true && garment.placementWhenNotWorn) {
      diagnostics.push({
        code: "wardrobe-worn-placement-conflict",
        level: "error",
        category: "wardrobe",
        paths: [`${garmentPath}.worn`, `${garmentPath}.placementWhenNotWorn`],
        message: `${garment.name}同时被描述为正在穿戴和放置在别处。`,
        suggestion: "确认该物品是否穿戴；若穿戴则删除放置位置，否则将 worn 改为 false。",
      });
    }

    const matchingPropIndex = props.findIndex(({ name }) => sameItemName(garment.name, name));
    if (matchingPropIndex >= 0) {
      const prop = props[matchingPropIndex];
      const garmentSide = oppositeSide(garment.placementWhenNotWorn);
      const propSide = oppositeSide(prop.placement);
      if (garmentSide && propSide && garmentSide !== propSide) {
        diagnostics.push({
          code: "spatial-placement-conflict",
          level: "error",
          category: "spatial",
          paths: [`${garmentPath}.placementWhenNotWorn`, `environment.props.${matchingPropIndex}.placement`],
          message: `${garment.name}在服装与环境描述中分别位于人物${garmentSide === "left" ? "左" : "右"}侧和${propSide === "left" ? "左" : "右"}侧。`,
          suggestion: "统一该物品的空间位置，只保留一个明确方位。",
        });
      }
    }

    const poseText = [spec.pose?.legs, ...(spec.pose?.contactPoints ?? [])].join("；");
    const explicitlyBarefoot = includesAny(poseText, ["未穿鞋", "没有穿鞋", "不穿鞋", "赤脚", "光脚"]);
    if (garment.category === "footwear" && garment.worn === true && explicitlyBarefoot) {
      diagnostics.push({
        code: "wardrobe-barefoot-footwear-conflict",
        level: "error",
        category: "wardrobe",
        paths: [`${garmentPath}.worn`, "pose.legs", "pose.contactPoints"],
        message: `${garment.name}被标记为正在穿戴，但人物姿势明确要求赤脚。`,
        suggestion: "将鞋子的 worn 改为 false 并指定放置位置，或者删除赤脚描述。",
      });
    }
    if (
      garment.category === "footwear" &&
      garment.worn === false &&
      !explicitlyBarefoot &&
      includesAny(poseText, ["穿着鞋", "穿鞋", "鞋踩在"])
    ) {
      diagnostics.push({
        code: "wardrobe-pose-state-conflict",
        level: "error",
        category: "wardrobe",
        paths: [`${garmentPath}.worn`, "pose.legs", "pose.contactPoints"],
        message: "鞋子被标记为未穿戴，但姿势描述仍表示人物正在穿鞋。",
        suggestion: "统一鞋子的穿戴状态，并相应修改脚部姿势或鞋子放置位置。",
      });
    }
  });

  for (let leftIndex = 0; leftIndex < garments.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < garments.length; rightIndex += 1) {
      const left = garments[leftIndex];
      const right = garments[rightIndex];
      if (!sameItemName(left.name, right.name)) continue;

      if (left.worn !== undefined && right.worn !== undefined && left.worn !== right.worn) {
        diagnostics.push({
          code: "wardrobe-duplicate-state-conflict",
          level: "error",
          category: "wardrobe",
          paths: [`wardrobe.garments.${leftIndex}.worn`, `wardrobe.garments.${rightIndex}.worn`],
          message: `${left.name}存在相互冲突的穿戴状态。`,
          suggestion: "合并重复服装条目，并保留一个明确的 worn 状态。",
        });
      }
      if (left.color && right.color && left.color !== right.color) {
        diagnostics.push({
          code: "wardrobe-color-conflict",
          level: "warning",
          category: "wardrobe",
          paths: [`wardrobe.garments.${leftIndex}.color`, `wardrobe.garments.${rightIndex}.color`],
          message: `${left.name}同时被指定为“${left.color}”和“${right.color}”。`,
          suggestion: "如果是同一件服装，请统一颜色；如果是两件服装，请使用不同名称区分。",
        });
      }
    }
  }
}

function diagnoseConstraints(spec: VisualSpec, diagnostics: DoctorDiagnostic[]) {
  const wardrobeLocked = spec.locks.wardrobe || spec.wardrobe?.locked;
  const keepWardrobe = spec.constraints.some(
    ({ target, requirement }) =>
      target.startsWith("wardrobe") && includesAny(requirement, ["保持", "不变", "锁定"]),
  );
  const wardrobeStateChanges = spec.wardrobe?.garments?.some(
    ({ worn, placementWhenNotWorn }) => worn === false || Boolean(placementWhenNotWorn),
  );
  if (wardrobeLocked && keepWardrobe && wardrobeStateChanges) {
    diagnostics.push({
      code: "locked-module-change-conflict",
      level: "error",
      category: "constraint",
      paths: ["locks.wardrobe", "constraints", "wardrobe.garments"],
      message: "服装被要求保持不变，但同一 VisualSpec 又要求脱下或移动服装。",
      suggestion: "二选一：保留 wardrobe 锁并删除换装动作，或解锁 wardrobe 后再描述服装变化。",
    });
  }

  for (const constraint of spec.constraints) {
    const conflicts = spec.negativeConstraints.find(
      ({ target, avoid }) =>
        target === constraint.target &&
        avoid.some((term) => constraint.requirement.includes(term)),
    );
    if (!conflicts) continue;
    diagnostics.push({
      code: "positive-negative-constraint-conflict",
      level: "error",
      category: "constraint",
      paths: ["constraints", "negativeConstraints"],
      message: `字段 ${constraint.target} 同时要求并禁止了相同内容。`,
      suggestion: "删除其中一条，或者重写 requirement 与 avoid，使两者表达不同目标。",
    });
  }
}

/** Runs deterministic, side-effect-free cross-field diagnostics. */
export function diagnoseVisualSpec(input: unknown): DoctorResult {
  const spec = VisualSpecSchema.parse(input);
  const diagnostics: DoctorDiagnostic[] = [];

  diagnoseCamera(spec, diagnostics);
  diagnoseComposition(spec, diagnostics);
  diagnosePose(spec, diagnostics);
  diagnoseSpatialAndWardrobe(spec, diagnostics);
  diagnoseConstraints(spec, diagnostics);

  const summary = {
    errors: diagnostics.filter(({ level }) => level === "error").length,
    warnings: diagnostics.filter(({ level }) => level === "warning").length,
    suggestions: diagnostics.filter(({ level }) => level === "suggestion").length,
  };

  return DoctorResultSchema.parse({
    canCompile: summary.errors === 0,
    diagnostics,
    summary,
  });
}
