import { z } from "zod";

const NonEmptyTextSchema = z.string().trim().min(1);

export const FaceShapeSchema = z.enum([
  "oval",
  "round",
  "square",
  "heart",
  "oblong",
  "diamond",
  "other",
]);

export const FaceSpecSchema = z
  .object({
    shape: FaceShapeSchema.optional().describe("Overall face silhouette."),
    ancestryPresentation: NonEmptyTextSchema.optional().describe(
      "Requested visible ancestry presentation, without inferring identity from an image.",
    ),
    eyes: z
      .object({
        color: NonEmptyTextSchema.optional(),
        shape: NonEmptyTextSchema.optional(),
        details: z.array(NonEmptyTextSchema).optional(),
      })
      .strict()
      .optional(),
    brows: NonEmptyTextSchema.optional(),
    nose: NonEmptyTextSchema.optional(),
    lips: NonEmptyTextSchema.optional(),
    jawline: NonEmptyTextSchema.optional(),
    distinguishingFeatures: z.array(NonEmptyTextSchema).optional(),
  })
  .strict();

export const HairSpecSchema = z
  .object({
    color: NonEmptyTextSchema.optional(),
    length: z
      .enum(["shaved", "very-short", "short", "medium", "long", "very-long"])
      .optional(),
    texture: z
      .enum(["straight", "wavy", "curly", "coily", "mixed", "other"])
      .optional(),
    style: NonEmptyTextSchema.optional(),
    parting: NonEmptyTextSchema.optional(),
    bangs: NonEmptyTextSchema.optional(),
    details: z.array(NonEmptyTextSchema).optional(),
  })
  .strict();

export const SkinSpecSchema = z
  .object({
    tone: NonEmptyTextSchema.optional().describe("User-requested visible skin tone."),
    undertone: z.enum(["cool", "neutral", "warm", "olive", "unspecified"]).optional(),
    texture: NonEmptyTextSchema.optional(),
    visibleDetails: z.array(NonEmptyTextSchema).optional(),
  })
  .strict();

export const BodyProportionSpecSchema = z
  .object({
    heightPresentation: z
      .enum(["short", "average", "tall", "unspecified"])
      .optional(),
    build: z
      .enum(["slender", "lean", "average", "athletic", "curvy", "broad", "other"])
      .optional(),
    shoulderToHip: NonEmptyTextSchema.optional(),
    torsoToLeg: NonEmptyTextSchema.optional(),
    details: z.array(NonEmptyTextSchema).optional(),
  })
  .strict();

export const ImmutableFeatureSchema = z
  .object({
    key: NonEmptyTextSchema.describe("Stable identifier such as mole-left-cheek."),
    description: NonEmptyTextSchema,
    region: NonEmptyTextSchema.optional(),
    visibility: z.enum(["always", "when-visible", "optional"]).default("when-visible"),
  })
  .strict();

export const IdentityLockSchema = z
  .object({
    face: z.boolean().optional(),
    hair: z.boolean().optional(),
    skin: z.boolean().optional(),
    bodyProportion: z.boolean().optional(),
    immutableFeatures: z.boolean().optional(),
  })
  .strict()
  .describe("Identity dimensions that must remain unchanged during an edit.");

export const IdentitySpecSchema = z
  .object({
    face: FaceSpecSchema.optional(),
    hair: HairSpecSchema.optional(),
    skin: SkinSpecSchema.optional(),
    bodyProportion: BodyProportionSpecSchema.optional(),
    immutableFeatures: z.array(ImmutableFeatureSchema).optional(),
    referenceIds: z
      .array(NonEmptyTextSchema)
      .optional()
      .describe("IDs of identity-role references declared on VisualSpec."),
    referenceStrength: z
      .number()
      .finite()
      .min(0)
      .max(1)
      .optional()
      .describe("Normalized identity-reference influence: 0 ignores it; 1 maximizes it."),
    locks: IdentityLockSchema.optional(),
  })
  .strict();

export type FaceSpec = z.infer<typeof FaceSpecSchema>;
export type HairSpec = z.infer<typeof HairSpecSchema>;
export type SkinSpec = z.infer<typeof SkinSpecSchema>;
export type BodyProportionSpec = z.infer<typeof BodyProportionSpecSchema>;
export type ImmutableFeature = z.infer<typeof ImmutableFeatureSchema>;
export type IdentityLock = z.infer<typeof IdentityLockSchema>;
export type IdentitySpecInput = z.input<typeof IdentitySpecSchema>;
export type IdentitySpec = z.output<typeof IdentitySpecSchema>;

export const IDENTITY_SPEC_DEFAULTS: IdentitySpec = IdentitySpecSchema.parse({
  immutableFeatures: [],
});
