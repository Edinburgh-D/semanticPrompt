import { CompiledVisualPlanSchema, type CompiledSection, type CompiledVisualPlan } from "./schemas";
import { VisualSpecSchema, type VisualSpec } from "../schemas/visual-spec";

function compact(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value?.trim()));
}

function labeled(label: string, value: string | number | boolean | undefined): string | undefined {
  if (value === undefined || value === "") return undefined;
  return `${label}: ${String(value)}`;
}

function joined(label: string, values: string[] | undefined): string | undefined {
  return values && values.length > 0 ? `${label}: ${values.join("; ")}` : undefined;
}

function addSection(
  sections: CompiledSection[],
  key: CompiledSection["key"],
  items: Array<string | undefined>,
) {
  const presentItems = compact(items);
  if (presentItems.length > 0) sections.push({ key, items: presentItems });
}

function compileEnvironment(spec: VisualSpec, sections: CompiledSection[]) {
  const environment = spec.environment;
  if (!environment) return;
  const props = environment.props?.map((prop) =>
    compact([
      prop.name,
      labeled("placement", prop.placement),
      labeled("state", prop.state),
      labeled("prominence", prop.prominence),
    ]).join(", "),
  );
  addSection(sections, "environment", [
    labeled("setting", environment.settingType),
    labeled("location", environment.location),
    labeled("era", environment.era),
    environment.description,
    joined("architectural features", environment.architecturalFeatures),
    joined("surfaces", environment.surfaces),
    joined("props", props),
    labeled("atmosphere", environment.atmosphere),
    labeled("time of day", environment.timeOfDay),
    labeled("weather", environment.weather),
  ]);
}

function compileSubject(spec: VisualSpec, sections: CompiledSection[]) {
  const subject = spec.subject;
  if (!subject) return;
  addSection(sections, "subject", [
    subject.description,
    labeled("category", subject.category),
    labeled("count", subject.count),
    labeled("age group", subject.ageGroup),
    labeled("gender presentation", subject.genderPresentation),
    labeled("action", subject.action),
    joined("relationships", subject.relationships),
    joined("attributes", subject.attributes),
  ]);
}

function compileIdentity(spec: VisualSpec, sections: CompiledSection[]) {
  const identity = spec.identity;
  if (!identity) return;
  const face = identity.face;
  const hair = identity.hair;
  const skin = identity.skin;
  const body = identity.bodyProportion;
  const immutableFeatures = identity.immutableFeatures?.map(({ description, region, visibility }) =>
    compact([description, labeled("region", region), labeled("visibility", visibility)]).join(", "),
  );
  const lockEntries = identity.locks
    ? Object.entries(identity.locks)
        .filter(([, locked]) => locked)
        .map(([field]) => field)
    : [];

  addSection(sections, "identity", [
    face
      ? compact([
          labeled("face shape", face.shape),
          labeled("ancestry presentation", face.ancestryPresentation),
          labeled("eyes", face.eyes ? compact([face.eyes.color, face.eyes.shape, ...(face.eyes.details ?? [])]).join(", ") : undefined),
          labeled("brows", face.brows),
          labeled("nose", face.nose),
          labeled("lips", face.lips),
          labeled("jawline", face.jawline),
          joined("distinguishing facial features", face.distinguishingFeatures),
        ]).join("; ")
      : undefined,
    hair
      ? compact([
          labeled("hair color", hair.color),
          labeled("hair length", hair.length),
          labeled("hair texture", hair.texture),
          labeled("hair style", hair.style),
          labeled("parting", hair.parting),
          labeled("bangs", hair.bangs),
          joined("hair details", hair.details),
        ]).join("; ")
      : undefined,
    skin
      ? compact([
          labeled("skin tone", skin.tone),
          labeled("skin undertone", skin.undertone),
          labeled("skin texture", skin.texture),
          joined("visible skin details", skin.visibleDetails),
        ]).join("; ")
      : undefined,
    body
      ? compact([
          labeled("height presentation", body.heightPresentation),
          labeled("build", body.build),
          labeled("shoulder-to-hip proportion", body.shoulderToHip),
          labeled("torso-to-leg proportion", body.torsoToLeg),
          joined("body details", body.details),
        ]).join("; ")
      : undefined,
    joined("immutable features", immutableFeatures),
    joined("locked identity dimensions", lockEntries),
    labeled("identity reference strength", identity.referenceStrength),
    joined("identity reference IDs", identity.referenceIds),
  ]);
}

function compileAppearance(spec: VisualSpec, sections: CompiledSection[]) {
  const appearance = spec.appearance;
  if (!appearance) return;
  addSection(sections, "appearance", [
    labeled("grooming", appearance.grooming),
    labeled("makeup", appearance.makeup),
    joined("accessories", appearance.accessories),
    joined("notable details", appearance.notableDetails),
  ]);
}

function compileWardrobe(spec: VisualSpec, sections: CompiledSection[]) {
  const wardrobe = spec.wardrobe;
  if (!wardrobe) return;
  const garments = wardrobe.garments?.map((garment) =>
    compact([
      garment.name,
      labeled("category", garment.category),
      labeled("color", garment.color),
      labeled("material", garment.material),
      labeled("fit", garment.fit),
      labeled("condition", garment.condition),
      garment.worn === true ? "worn by the subject" : garment.worn === false ? "not worn" : undefined,
      labeled("placement when not worn", garment.placementWhenNotWorn),
      joined("details", garment.details),
    ]).join(", "),
  );
  addSection(sections, "wardrobe", [
    labeled("style", wardrobe.style),
    joined("garments", garments),
    joined("layering", wardrobe.layering),
    wardrobe.locked === true ? "keep wardrobe unchanged" : undefined,
    joined("wardrobe reference IDs", wardrobe.referenceIds),
  ]);
}

function compilePose(spec: VisualSpec, sections: CompiledSection[]) {
  const pose = spec.pose;
  if (!pose) return;
  addSection(sections, "pose", [
    labeled("pose description", pose.description),
    labeled("base pose", pose.base),
    labeled("body orientation", pose.orientation),
    labeled("gaze", pose.gaze),
    labeled("expression", pose.expression),
    labeled("torso", pose.torso),
    labeled("arms", pose.arms),
    labeled("legs", pose.legs),
    joined("contact points", pose.contactPoints),
    pose.locked === true ? "keep pose unchanged" : undefined,
    joined("pose reference IDs", pose.referenceIds),
  ]);
}

function compileComposition(spec: VisualSpec, sections: CompiledSection[]) {
  const composition = spec.composition;
  if (!composition) return;
  addSection(sections, "composition", [
    labeled("framing", composition.framing),
    labeled("canvas orientation", composition.orientation),
    labeled("subject placement", composition.subjectPlacement),
    labeled("view direction", composition.viewDirection),
    labeled("crop", composition.crop),
    labeled("foreground", composition.foreground),
    labeled("midground", composition.midground),
    labeled("background", composition.background),
    labeled("negative space", composition.negativeSpace),
    composition.aspectRatio
      ? `aspect ratio: ${composition.aspectRatio.width}:${composition.aspectRatio.height}`
      : undefined,
    joined("composition reference IDs", composition.referenceIds),
  ]);
}

function compileCamera(spec: VisualSpec, sections: CompiledSection[]) {
  const camera = spec.camera;
  if (!camera) return;
  const lens = camera.lens;
  const focalLength = lens
    ? lens.minFocalLengthMm === lens.maxFocalLengthMm || lens.maxFocalLengthMm === undefined
      ? labeled("focal length", lens.minFocalLengthMm ? `${lens.minFocalLengthMm}mm` : undefined)
      : lens.minFocalLengthMm === undefined
        ? labeled("focal length", `${lens.maxFocalLengthMm}mm`)
        : `focal length: ${lens.minFocalLengthMm}–${lens.maxFocalLengthMm}mm`
    : undefined;
  addSection(sections, "camera", [
    focalLength,
    labeled("lens type", lens?.type),
    labeled("distance scale", camera.distance?.scale),
    labeled("distance", camera.distance?.description),
    labeled("relative distance", camera.distance?.relativeReference),
    labeled("camera height", camera.height),
    labeled("camera angle", camera.angle),
    labeled("depth of field", camera.depthOfField),
    labeled("focus target", camera.focusTarget),
    labeled("capture style", camera.captureStyle),
  ]);
}

function compileLightingAndColor(spec: VisualSpec, sections: CompiledSection[]) {
  const lighting = spec.lighting;
  if (lighting) {
    addSection(sections, "lighting", [
      labeled("lighting style", lighting.style),
      labeled("intensity", lighting.intensity),
      labeled("direction", lighting.direction),
      labeled("quality", lighting.quality),
      joined("sources", lighting.sources),
      labeled("color temperature", lighting.colorTemperature),
      labeled("contrast", lighting.contrast),
      labeled("face exposure", lighting.faceExposure),
    ]);
  }

  const color = spec.color;
  if (color) {
    addSection(sections, "color", [
      labeled("saturation", color.saturation),
      joined("palette", color.palette),
      joined("dominant colors", color.dominantColors),
      labeled("contrast", color.contrast),
      labeled("grading", color.grading),
      labeled("temperature", color.temperature),
    ]);
  }
}

function compileAesthetic(spec: VisualSpec, sections: CompiledSection[]) {
  const aesthetic = spec.aesthetic;
  if (!aesthetic) return;
  addSection(sections, "aesthetic", [
    labeled("medium", aesthetic.medium),
    joined("genres", aesthetic.genres),
    joined("mood", aesthetic.mood),
    labeled("realism", aesthetic.realism),
    labeled("texture", aesthetic.texture),
    joined("style references", aesthetic.styleReferences),
    joined("style reference IDs", aesthetic.referenceIds),
  ]);
}

/** Compiles a validated VisualSpec into a deterministic, model-neutral visual plan. */
export function compileVisualSpec(input: unknown): CompiledVisualPlan {
  const spec = VisualSpecSchema.parse(input);
  const sections: CompiledSection[] = [];

  compileEnvironment(spec, sections);
  compileSubject(spec, sections);
  compileIdentity(spec, sections);
  compileAppearance(spec, sections);
  compileWardrobe(spec, sections);
  compilePose(spec, sections);
  compileComposition(spec, sections);
  compileCamera(spec, sections);
  compileLightingAndColor(spec, sections);
  compileAesthetic(spec, sections);

  return CompiledVisualPlanSchema.parse({
    version: "1.0",
    sourceSpecVersion: spec.version,
    sections,
    constraints: [
      ...spec.constraints.map(({ target, requirement, priority }) => ({
        kind: "requirement" as const,
        target,
        instruction: requirement,
        priority,
      })),
      ...spec.negativeConstraints.flatMap(({ target, avoid, severity }) =>
        avoid.map((instruction) => ({
          kind: "avoidance" as const,
          target,
          instruction,
          priority: severity,
        })),
      ),
    ],
    references: spec.references,
  });
}
