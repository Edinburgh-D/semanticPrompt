import { diffVisualSpecs } from "../diff";
import { VisualSpecSchema, type VisualSpec } from "../schemas/visual-spec";
import {
  EnhancedParserOutputSchema,
  type EnhancedParserOutput,
  type FieldProvenance,
  type LlmProvider,
} from "./enhanced-schemas";
import { parseVisualIntent } from "./parser";
import type { ParserInput, ParserOutput } from "./schemas";

type JsonRecord = Record<string, unknown>;

export interface LlmSupplementRequest {
  sourceText: string;
  ruleOutput: ParserOutput;
}

export interface LlmSupplementResponse {
  provider: LlmProvider;
  model: string;
  candidate: unknown;
}

export type LlmSupplementGenerator = (
  request: LlmSupplementRequest,
) => Promise<LlmSupplementResponse>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function pathIsProtected(path: string, protectedPaths: ReadonlySet<string>): boolean {
  return protectedPaths.has(path);
}

function mergeValue(
  ruleValue: unknown,
  llmValue: unknown,
  path: string,
  protectedPaths: ReadonlySet<string>,
  ignoredPaths: string[],
): unknown {
  if (pathIsProtected(path, protectedPaths)) {
    if (!isEqual(ruleValue, llmValue)) ignoredPaths.push(path);
    return ruleValue;
  }

  if (llmValue === undefined) return ruleValue;
  if (isRecord(ruleValue) && isRecord(llmValue)) {
    const result: JsonRecord = { ...ruleValue };
    for (const key of Object.keys(llmValue)) {
      const childPath = path ? `${path}.${key}` : key;
      result[key] = mergeValue(ruleValue[key], llmValue[key], childPath, protectedPaths, ignoredPaths);
    }
    return result;
  }

  return llmValue;
}

function valueAtPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined;
    return current[key];
  }, value);
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return true;
}

/**
 * Merges an LLM candidate into deterministic output without allowing any
 * rule-recognized field to be overwritten.
 */
export function mergeLlmSupplement(
  ruleOutput: ParserOutput,
  candidateInput: unknown,
): { spec: VisualSpec; ignoredPaths: string[] } {
  const candidate = VisualSpecSchema.parse(candidateInput);
  const protectedPaths = new Set([
    "version",
    "locks",
    ...ruleOutput.confidence.fields.map(({ path }) => path),
  ]);
  const ignoredPaths: string[] = [];
  const merged = mergeValue(
    ruleOutput.spec,
    candidate,
    "",
    protectedPaths,
    ignoredPaths,
  );

  return {
    spec: VisualSpecSchema.parse(merged),
    ignoredPaths: [...new Set(ignoredPaths)].sort(),
  };
}

/** Runs deterministic parsing first, then supplements only unresolved fields with an LLM. */
export async function parseVisualIntentEnhanced(
  input: ParserInput,
  generateSupplement: LlmSupplementGenerator,
): Promise<EnhancedParserOutput> {
  const ruleOutput = parseVisualIntent(input);
  const completion = await generateSupplement({
    sourceText: ruleOutput.sourceText,
    ruleOutput,
  });
  const { spec, ignoredPaths } = mergeLlmSupplement(ruleOutput, completion.candidate);
  const llmDiff = diffVisualSpecs(ruleOutput.spec, spec);

  const ruleProvenance: FieldProvenance[] = ruleOutput.confidence.fields.map((field) => ({
    path: field.path,
    source: "rule",
    confidence: field.score,
    evidence: field.evidence,
  }));
  const llmProvenance: FieldProvenance[] = llmDiff.map(({ path }) => ({
    path,
    source: "llm",
    confidence: 0.72,
    evidence: [`${completion.provider}:${completion.model}`],
  }));
  const provenance = [...ruleProvenance, ...llmProvenance];
  const fields = provenance.map(({ path, confidence: score, evidence }) => ({
    path,
    score,
    evidence,
  }));
  const overall =
    fields.length === 0
      ? ruleOutput.confidence.overall
      : Math.round((fields.reduce((sum, field) => sum + field.score, 0) / fields.length) * 100) / 100;

  return EnhancedParserOutputSchema.parse({
    ...ruleOutput,
    spec,
    missingInformation: ruleOutput.missingInformation.filter(
      ({ path }) => !hasMeaningfulValue(valueAtPath(spec, path)),
    ),
    confidence: { overall, fields },
    provenance,
    llm: {
      provider: completion.provider,
      model: completion.model,
      appliedPaths: llmDiff.map(({ path }) => path),
      ignoredPaths,
    },
  });
}

