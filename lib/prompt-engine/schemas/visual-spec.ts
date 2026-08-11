import { z } from "zod";

import { IdentitySpecSchema } from "./identity-spec";

const NonEmptyTextSchema = z.string().trim().min(1);

export const VisualReferenceRoleSchema = z.enum([
  "identity",
  "wardrobe",
  "pose",
  "composition",
  "environment",
  "style",
]);

export const VisualReferenceSchema = z
  .object({
    id: NonEmptyTextSchema.describe("Stable application-level reference identifier."),
    role: VisualReferenceRoleSchema,
    strength: z.number().finite().min(0).max(1).optional(),
    notes: NonEmptyTextSchema.optional(),
  })
  .strict();

export const SubjectSpecSchema = z
  .object({
    category: z.enum(["person", "animal", "object", "scene", "other"]).optional(),
    count: z.number().int().positive().optional(),
    description: NonEmptyTextSchema.optional(),
    ageGroup: z
      .enum(["child", "teen", "adult", "older-adult", "not-applicable"])
      .optional(),
    genderPresentation: NonEmptyTextSchema.optional(),
    action: NonEmptyTextSchema.optional(),
    relationships: z.array(NonEmptyTextSchema).optional(),
    attributes: z.array(NonEmptyTextSchema).optional(),
  })
  .strict();

export const AppearanceSpecSchema = z
  .object({
    grooming: NonEmptyTextSchema.optional(),
    makeup: NonEmptyTextSchema.optional(),
    accessories: z.array(NonEmptyTextSchema).optional(),
    notableDetails: z.array(NonEmptyTextSchema).optional(),
  })
  .strict();

export const GarmentSpecSchema = z
  .object({
    category: z
      .enum(["top", "bottom", "dress", "outerwear", "underwear", "swimwear", "hosiery", "footwear", "accessory", "other"])
      .optional(),
    name: NonEmptyTextSchema,
    color: NonEmptyTextSchema.optional(),
    material: NonEmptyTextSchema.optional(),
    fit: NonEmptyTextSchema.optional(),
    condition: NonEmptyTextSchema.optional(),
    worn: z.boolean().optional().describe("Whether the subject is currently wearing this item."),
    placementWhenNotWorn: NonEmptyTextSchema.optional(),
    details: z.array(NonEmptyTextSchema).optional(),
  })
  .strict();

export const WardrobeSpecSchema = z
  .object({
    style: NonEmptyTextSchema.optional(),
    garments: z.array(GarmentSpecSchema).optional(),
    layering: z.array(NonEmptyTextSchema).optional(),
    referenceIds: z.array(NonEmptyTextSchema).optional(),
    locked: z.boolean().optional(),
  })
  .strict();

export const PoseSpecSchema = z
  .object({
    description: NonEmptyTextSchema.optional(),
    base: z
      .enum(["standing", "sitting", "kneeling", "lying", "crouching", "moving", "other"])
      .optional(),
    orientation: z
      .enum(["front", "three-quarter", "profile", "back", "mixed"])
      .optional(),
    gaze: NonEmptyTextSchema.optional(),
    expression: NonEmptyTextSchema.optional(),
    torso: NonEmptyTextSchema.optional(),
    arms: NonEmptyTextSchema.optional(),
    legs: NonEmptyTextSchema.optional(),
    contactPoints: z.array(NonEmptyTextSchema).optional(),
    referenceIds: z.array(NonEmptyTextSchema).optional(),
    locked: z.boolean().optional(),
  })
  .strict();

export const CompositionSpecSchema = z
  .object({
    framing: z
      .enum([
        "extreme-close-up",
        "close-up",
        "medium-close-up",
        "medium",
        "medium-full",
        "full-body",
        "wide",
        "extreme-wide",
      ])
      .optional(),
    orientation: z.enum(["portrait", "landscape", "square", "unspecified"]).optional(),
    subjectPlacement: z
      .enum(["center", "left", "right", "upper", "lower", "rule-of-thirds", "custom"])
      .optional(),
    viewDirection: z.enum(["front", "three-quarter", "side", "rear", "overhead"]).optional(),
    crop: NonEmptyTextSchema.optional(),
    foreground: NonEmptyTextSchema.optional(),
    midground: NonEmptyTextSchema.optional(),
    background: NonEmptyTextSchema.optional(),
    negativeSpace: NonEmptyTextSchema.optional(),
    aspectRatio: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict()
      .optional(),
    referenceIds: z.array(NonEmptyTextSchema).optional(),
  })
  .strict();

export const CameraSpecSchema = z
  .object({
    lens: z
      .object({
        minFocalLengthMm: z.number().positive().optional(),
        maxFocalLengthMm: z.number().positive().optional(),
        type: z.enum(["ultra-wide", "wide", "normal", "telephoto", "macro", "other"]).optional(),
      })
      .strict()
      .refine(
        ({ minFocalLengthMm, maxFocalLengthMm }) =>
          minFocalLengthMm === undefined ||
          maxFocalLengthMm === undefined ||
          minFocalLengthMm <= maxFocalLengthMm,
        { message: "Minimum focal length must not exceed maximum focal length." },
      )
      .optional(),
    distance: z
      .object({
        scale: z.enum(["intimate", "near", "medium", "far", "very-far"]).optional(),
        description: NonEmptyTextSchema.optional(),
        relativeReference: NonEmptyTextSchema.optional(),
      })
      .strict()
      .optional(),
    height: z.enum(["ground", "low", "eye-level", "high", "overhead"]).optional(),
    angle: NonEmptyTextSchema.optional(),
    depthOfField: z.enum(["shallow", "moderate", "deep", "unspecified"]).optional(),
    focusTarget: NonEmptyTextSchema.optional(),
    captureStyle: NonEmptyTextSchema.optional(),
  })
  .strict();

export const EnvironmentPropSchema = z
  .object({
    name: NonEmptyTextSchema,
    placement: NonEmptyTextSchema.optional(),
    state: NonEmptyTextSchema.optional(),
    prominence: z.enum(["background", "supporting", "important"]).optional(),
  })
  .strict();

export const EnvironmentSpecSchema = z
  .object({
    settingType: z.enum(["interior", "exterior", "mixed", "studio", "abstract"]).optional(),
    location: NonEmptyTextSchema.optional(),
    era: NonEmptyTextSchema.optional(),
    description: NonEmptyTextSchema.optional(),
    architecturalFeatures: z.array(NonEmptyTextSchema).optional(),
    surfaces: z.array(NonEmptyTextSchema).optional(),
    props: z.array(EnvironmentPropSchema).optional(),
    atmosphere: NonEmptyTextSchema.optional(),
    timeOfDay: NonEmptyTextSchema.optional(),
    weather: NonEmptyTextSchema.optional(),
    referenceIds: z.array(NonEmptyTextSchema).optional(),
  })
  .strict();

export const LightingSpecSchema = z
  .object({
    style: NonEmptyTextSchema.optional(),
    intensity: z.enum(["very-dim", "dim", "balanced", "bright", "very-bright"]).optional(),
    direction: NonEmptyTextSchema.optional(),
    quality: z.enum(["hard", "soft", "diffused", "mixed"]).optional(),
    sources: z.array(NonEmptyTextSchema).optional(),
    colorTemperature: z.enum(["cool", "neutral", "warm", "mixed"]).optional(),
    contrast: z.enum(["low", "medium", "high"]).optional(),
    faceExposure: z
      .enum(["underexposed", "natural", "bright", "silhouette", "not-applicable"])
      .optional(),
  })
  .strict();

export const ColorSpecSchema = z
  .object({
    saturation: z.enum(["monochrome", "very-low", "low", "medium", "high"]).optional(),
    palette: z.array(NonEmptyTextSchema).optional(),
    dominantColors: z.array(NonEmptyTextSchema).optional(),
    contrast: z.enum(["low", "medium", "high"]).optional(),
    grading: NonEmptyTextSchema.optional(),
    temperature: z.enum(["cool", "neutral", "warm", "mixed"]).optional(),
  })
  .strict();

export const AestheticSpecSchema = z
  .object({
    medium: z.enum(["photography", "illustration", "digital-art", "3d", "mixed", "other"]).optional(),
    genres: z.array(NonEmptyTextSchema).optional(),
    mood: z.array(NonEmptyTextSchema).optional(),
    realism: z.enum(["documentary", "photorealistic", "realistic", "stylized", "abstract"]).optional(),
    texture: NonEmptyTextSchema.optional(),
    styleReferences: z.array(NonEmptyTextSchema).optional(),
    referenceIds: z.array(NonEmptyTextSchema).optional(),
  })
  .strict();

export const ConstraintSchema = z
  .object({
    target: NonEmptyTextSchema.describe("VisualSpec path or visual dimension affected."),
    requirement: NonEmptyTextSchema,
    priority: z.enum(["low", "medium", "high", "required"]).default("medium"),
  })
  .strict();

export const NegativeConstraintSchema = z
  .object({
    target: NonEmptyTextSchema,
    avoid: z.array(NonEmptyTextSchema).min(1),
    severity: z.enum(["low", "medium", "high"]).default("medium"),
  })
  .strict();

export const VisualSpecLocksSchema = z
  .object({
    identity: z.boolean().default(false),
    wardrobe: z.boolean().default(false),
    pose: z.boolean().default(false),
    camera: z.boolean().default(false),
    environment: z.boolean().default(false),
    lighting: z.boolean().default(false),
  })
  .strict()
  .default({
    identity: false,
    wardrobe: false,
    pose: false,
    camera: false,
    environment: false,
    lighting: false,
  });

export const VisualSpecSchema = z
  .object({
    version: z.literal("1.0").default("1.0"),
    subject: SubjectSpecSchema.optional(),
    identity: IdentitySpecSchema.optional(),
    appearance: AppearanceSpecSchema.optional(),
    wardrobe: WardrobeSpecSchema.optional(),
    pose: PoseSpecSchema.optional(),
    composition: CompositionSpecSchema.optional(),
    camera: CameraSpecSchema.optional(),
    environment: EnvironmentSpecSchema.optional(),
    lighting: LightingSpecSchema.optional(),
    color: ColorSpecSchema.optional(),
    aesthetic: AestheticSpecSchema.optional(),
    constraints: z.array(ConstraintSchema).default([]),
    negativeConstraints: z.array(NegativeConstraintSchema).default([]),
    references: z.array(VisualReferenceSchema).default([]),
    locks: VisualSpecLocksSchema,
  })
  .strict();

export type VisualReference = z.infer<typeof VisualReferenceSchema>;
export type SubjectSpec = z.infer<typeof SubjectSpecSchema>;
export type AppearanceSpec = z.infer<typeof AppearanceSpecSchema>;
export type GarmentSpec = z.infer<typeof GarmentSpecSchema>;
export type WardrobeSpec = z.infer<typeof WardrobeSpecSchema>;
export type PoseSpec = z.infer<typeof PoseSpecSchema>;
export type CompositionSpec = z.infer<typeof CompositionSpecSchema>;
export type CameraSpec = z.infer<typeof CameraSpecSchema>;
export type EnvironmentSpec = z.infer<typeof EnvironmentSpecSchema>;
export type LightingSpec = z.infer<typeof LightingSpecSchema>;
export type ColorSpec = z.infer<typeof ColorSpecSchema>;
export type AestheticSpec = z.infer<typeof AestheticSpecSchema>;
export type Constraint = z.infer<typeof ConstraintSchema>;
export type NegativeConstraint = z.infer<typeof NegativeConstraintSchema>;
export type VisualSpecLocks = z.infer<typeof VisualSpecLocksSchema>;
export type VisualSpecInput = z.input<typeof VisualSpecSchema>;
export type VisualSpec = z.output<typeof VisualSpecSchema>;

export const VISUAL_SPEC_DEFAULTS: VisualSpec = VisualSpecSchema.parse({});
