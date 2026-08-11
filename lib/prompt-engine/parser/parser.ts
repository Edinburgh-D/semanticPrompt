import { VisualSpecSchema } from "../schemas/visual-spec";
import { applyDeterministicRules } from "./rules";
import {
  ParserInputSchema,
  ParserOutputSchema,
  type MissingInformation,
  type ParserInput,
  type ParserOutput,
} from "./schemas";

function roundConfidence(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Deterministic Chinese parser for common visual phrases.
 * It is intentionally conservative: contextual relationships remain for the LLM supplement.
 */
export function parseVisualIntent(input: ParserInput): ParserOutput {
  const { text } = ParserInputSchema.parse(input);
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const { spec: candidate, ambiguities, confidenceFields } = applyDeterministicRules(normalizedText);
  const spec = VisualSpecSchema.parse(candidate);
  const missingInformation: MissingInformation[] = [];

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
  const averageFieldConfidence = confidenceFields.length === 0
    ? 0
    : confidenceFields.reduce((sum, field) => sum + field.score, 0) / confidenceFields.length;
  const coverageFactor = Math.min(1, categoryCount / 6);
  const ambiguityPenalty = ambiguities.filter(({ severity }) => severity === "blocking").length * 0.12;
  const overall = roundConfidence(
    Math.max(0.05, Math.min(0.99, averageFieldConfidence * coverageFactor - ambiguityPenalty)),
  );

  return ParserOutputSchema.parse({
    sourceText: normalizedText,
    spec,
    ambiguities,
    missingInformation,
    confidence: { overall, fields: confidenceFields },
  });
}
