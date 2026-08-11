import { NextResponse } from "next/server";
import { z } from "zod";

import { parseVisualIntentEnhanced } from "../../../lib/prompt-engine";
import { getConfiguredLlmParserProvider } from "../../../lib/server/llm-parser-provider";

export const runtime = "nodejs";

const RequestSchema = z
  .object({
    text: z.string().trim().min(1).max(12_000),
    locale: z.literal("zh-CN").default("zh-CN"),
  })
  .strict();

export async function POST(request: Request) {
  const parsedBody = RequestSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsedBody.success) {
    return NextResponse.json(
      { code: "invalid-request", error: "请输入 1–12000 字符的中文视觉描述。" },
      { status: 400 },
    );
  }

  const configured = getConfiguredLlmParserProvider();
  if (!configured) {
    return NextResponse.json(
      {
        code: "llm-not-configured",
        error: "未配置 LLM Parser。请设置 OPENAI_API_KEY 或 DEEPSEEK_API_KEY。",
      },
      { status: 503 },
    );
  }

  try {
    const output = await parseVisualIntentEnhanced(parsedBody.data, configured.generate);
    return NextResponse.json(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知 LLM Parser 错误";
    return NextResponse.json(
      { code: "llm-parser-failed", error: `LLM 补全失败：${message}` },
      { status: 502 },
    );
  }
}

