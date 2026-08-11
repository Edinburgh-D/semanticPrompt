import { z } from "zod";

import { CompiledVisualPlanSchema, type CompiledSectionKey } from "../compiler";
import { ModelPromptSchema, type ModelAdapter } from "./types";

export const GptImagePromptSchema = ModelPromptSchema.extend({
  adapter: z.literal("gpt-image"),
  adapterVersion: z.literal("1.0"),
  targetModel: z.literal("gpt-image-2"),
}).strict();

export type GptImagePrompt = z.infer<typeof GptImagePromptSchema>;

const SECTION_TITLES: Record<CompiledSectionKey, string> = {
  environment: "Scene and environment",
  subject: "Subject",
  identity: "Identity",
  appearance: "Appearance",
  wardrobe: "Wardrobe",
  pose: "Pose and action",
  composition: "Composition",
  camera: "Camera",
  lighting: "Lighting",
  color: "Color palette",
  aesthetic: "Visual style",
};

function renderBullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export const GPT_IMAGE_ADAPTER: ModelAdapter<GptImagePrompt> = {
  id: "gpt-image",
  compile(input) {
    const plan = CompiledVisualPlanSchema.parse(input);
    const isPhotorealistic = plan.sections.some(
      ({ key, items }) => key === "aesthetic" && items.some((item) => item.includes("photorealistic")),
    );
    const blocks: string[] = [
      isPhotorealistic
        ? "Create a photorealistic image that follows this visual specification."
        : "Create an image that follows this visual specification.",
    ];

    for (const section of plan.sections) {
      blocks.push(`${SECTION_TITLES[section.key]}:\n${renderBullets(section.items)}`);
    }

    if (plan.references.length > 0) {
      const referenceItems = plan.references.map(({ id, role, strength, notes }) => {
        const details = [
          `role: ${role}`,
          strength === undefined ? undefined : `influence: ${strength}`,
          notes ? `notes: ${notes}` : undefined,
        ].filter((value): value is string => value !== undefined);
        return `Reference ${id} — ${details.join(", ")}`;
      });
      blocks.push(`Reference inputs:\n${renderBullets(referenceItems)}`);
    }

    const requirements = plan.constraints.filter(({ kind }) => kind === "requirement");
    if (requirements.length > 0) {
      blocks.push(
        `Constraints:\n${renderBullets(
          requirements.map(
            ({ target, instruction, priority }) => `[${priority.toUpperCase()}] ${target}: ${instruction}`,
          ),
        )}`,
      );
    }

    const avoidances = plan.constraints.filter(({ kind }) => kind === "avoidance");
    if (avoidances.length > 0) {
      blocks.push(
        `Avoid:\n${renderBullets(
          avoidances.map(
            ({ target, instruction, priority }) => `[${priority.toUpperCase()}] ${target}: ${instruction}`,
          ),
        )}`,
      );
    }

    return GptImagePromptSchema.parse({
      adapter: "gpt-image",
      adapterVersion: "1.0",
      targetModel: "gpt-image-2",
      prompt: blocks.join("\n\n"),
    });
  },
};
