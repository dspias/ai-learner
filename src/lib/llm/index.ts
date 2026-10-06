import { z } from "zod";
import type { CompleteOptions, CompleteResult, ProviderId, UsageTokens } from "./types";
import { anthropicProvider } from "./anthropic";
import { openaiProvider } from "./openai";
import { assertWithinQuota, recordUsage } from "@/server/usage";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const DEFAULT_OPENAI_MODEL = "gpt-4o";

const providers = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
} as const;

/** When present, LLM calls are quota-checked before and recorded after. */
export type Meter = { userId: string; feature: string };

export function resolveLlm(): { provider: ProviderId; model: string } {
  const raw = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  if (raw === "openai") {
    return { provider: "openai", model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL };
  }
  return {
    provider: "anthropic",
    model: process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
  };
}

export function activeLlmLabel(): string {
  const { provider, model } = resolveLlm();
  return `${provider}:${model}`;
}

async function complete(opts: CompleteOptions): Promise<CompleteResult> {
  const { provider, model } = resolveLlm();
  return providers[provider].complete(model, opts);
}

const zeroUsage = (): UsageTokens => ({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
function addUsage(a: UsageTokens, b: UsageTokens): UsageTokens {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

/** Free-form text generation. Pass a meter to enforce + record token usage. */
export async function generateText(opts: CompleteOptions, meter?: Meter): Promise<string> {
  const { provider, model } = resolveLlm();
  if (meter) await assertWithinQuota(meter.userId);

  const result = await complete(opts);
  if (meter) {
    await recordUsage({ userId: meter.userId, feature: meter.feature, provider, model, usage: result.usage });
  }
  return result.text;
}

function extractJSON(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();

  const firstObj = t.indexOf("{");
  const firstArr = t.indexOf("[");
  const start =
    firstArr === -1 ? firstObj : firstObj === -1 ? firstArr : Math.min(firstObj, firstArr);
  const lastObj = t.lastIndexOf("}");
  const lastArr = t.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);

  return JSON.parse(t);
}

/**
 * JSON generation validated against `schema`, with one retry on invalid output.
 * Pass a meter to enforce quota before the first call and record the total
 * tokens spent across attempts. Works for any provider.
 */
export async function generateStructured<T>(
  opts: {
    system: string;
    prompt: string;
    schema: z.ZodType<T, z.ZodTypeDef, unknown>;
    maxTokens?: number;
  },
  meter?: Meter,
): Promise<T> {
  const { system, prompt, schema, maxTokens = 4096 } = opts;
  const { provider, model } = resolveLlm();
  if (meter) await assertWithinQuota(meter.userId);

  const jsonRule =
    "\n\nReturn ONLY valid JSON matching the requested shape. " +
    "No markdown, no code fences, no prose before or after the JSON.";

  let correction = "";
  let lastError: unknown = null;
  let spent = zeroUsage();

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await complete({
        system: system + jsonRule,
        messages: [{ role: "user", content: prompt + correction }],
        maxTokens,
      });
      spent = addUsage(spent, result.usage);

      try {
        const parsed = schema.safeParse(extractJSON(result.text));
        if (parsed.success) return parsed.data;
        lastError = parsed.error;
        const issues = parsed.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ");
        correction = `\n\nYour previous response was invalid JSON for this task: ${issues}. Return corrected JSON only.`;
      } catch (e) {
        lastError = e;
        correction =
          "\n\nYour previous response could not be parsed as JSON. Return valid JSON only.";
      }
    }
    throw new Error(`LLM returned invalid output after one retry: ${String(lastError)}`);
  } finally {
    if (meter) {
      await recordUsage({ userId: meter.userId, feature: meter.feature, provider, model, usage: spent });
    }
  }
}
