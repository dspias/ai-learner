import OpenAI from "openai";
import type { LlmProvider } from "./types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const openaiProvider: LlmProvider = {
  id: "openai",
  async complete(model, { system, messages, maxTokens }) {
    const res = await client.chat.completions.create({
      model,
      // Newer models (gpt-5 / o-series) require max_completion_tokens and
      // reject max_tokens; gpt-4o accepts it too, so use it universally.
      max_completion_tokens: maxTokens ?? 1500,
      messages: [{ role: "system", content: system }, ...messages],
    });
    const inputTokens = res.usage?.prompt_tokens ?? 0;
    const outputTokens = res.usage?.completion_tokens ?? 0;
    const totalTokens = res.usage?.total_tokens ?? inputTokens + outputTokens;
    return {
      text: (res.choices[0]?.message?.content ?? "").trim(),
      usage: { inputTokens, outputTokens, totalTokens },
    };
  },
};
