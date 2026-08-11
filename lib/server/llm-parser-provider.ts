import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import {
  VisualSpecSchema,
  type LlmProvider,
  type LlmSupplementGenerator,
  type LlmSupplementRequest,
} from "../prompt-engine";

const ProviderPreferenceSchema = z.enum(["openai", "deepseek"]);

interface ConfiguredProvider {
  provider: LlmProvider;
  model: string;
  generate: LlmSupplementGenerator;
}

function buildSystemPrompt(): string {
  return [
    "You extract visual intent from Chinese natural language into a VisualSpec JSON object.",
    "Only include visual facts supported by the user's source. Do not invent identity, styling, or constraints.",
    "The deterministic rule result is authoritative. Return a complete candidate, but do not intentionally contradict it.",
    "Use exact schema enum values. Output JSON only.",
  ].join(" ");
}

function buildUserPrompt({ sourceText, ruleOutput }: LlmSupplementRequest): string {
  const schema = z.toJSONSchema(VisualSpecSchema);
  return [
    "SOURCE TEXT:",
    sourceText,
    "",
    "DETERMINISTIC RULE RESULT (authoritative):",
    JSON.stringify(ruleOutput.spec),
    "",
    "VISUALSPEC JSON SCHEMA:",
    JSON.stringify(schema),
    "",
    "Return one complete VisualSpec JSON object. Fill unresolved fields only when the source supports them.",
  ].join("\n");
}

function createOpenAiProvider(apiKey: string): ConfiguredProvider {
  const model = process.env.OPENAI_PARSER_MODEL ?? "gpt-5.6-luna";
  const client = new OpenAI({ apiKey });

  return {
    provider: "openai",
    model,
    generate: async (request) => {
      const completion = await client.chat.completions.parse({
        model,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(request) },
        ],
        response_format: zodResponseFormat(VisualSpecSchema, "visual_spec"),
      });
      const candidate = completion.choices[0]?.message.parsed;
      if (!candidate) throw new Error("OpenAI 没有返回可解析的 VisualSpec。");
      return { provider: "openai", model, candidate };
    },
  };
}

function createDeepSeekProvider(apiKey: string): ConfiguredProvider {
  const model = process.env.DEEPSEEK_PARSER_MODEL ?? "deepseek-chat";
  const client = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });

  return {
    provider: "deepseek",
    model,
    generate: async (request) => {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(request) },
        ],
        response_format: { type: "json_object" },
        max_tokens: 6000,
      });
      const content = completion.choices[0]?.message.content;
      if (!content) throw new Error("DeepSeek 没有返回 VisualSpec JSON。");
      return { provider: "deepseek", model, candidate: JSON.parse(content) };
    },
  };
}

/** Selects one server-side provider without exposing credentials to the browser. */
export function getConfiguredLlmParserProvider(): ConfiguredProvider | undefined {
  const preferred = ProviderPreferenceSchema.safeParse(process.env.LLM_PARSER_PROVIDER);
  const openAiKey = process.env.OPENAI_API_KEY;
  const deepSeekKey = process.env.DEEPSEEK_API_KEY;

  if (preferred.success && preferred.data === "openai") {
    return openAiKey ? createOpenAiProvider(openAiKey) : undefined;
  }
  if (preferred.success && preferred.data === "deepseek") {
    return deepSeekKey ? createDeepSeekProvider(deepSeekKey) : undefined;
  }
  if (openAiKey) return createOpenAiProvider(openAiKey);
  if (deepSeekKey) return createDeepSeekProvider(deepSeekKey);
  return undefined;
}

