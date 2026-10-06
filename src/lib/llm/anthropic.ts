import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function textOf(res: Anthropic.Message): string {
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export const anthropicProvider: LlmProvider = {
  id: "anthropic",
  async complete(model, { system, messages, maxTokens }) {
    const res = await client.messages.create({
      model,
      max_tokens: maxTokens ?? 1500,
      system,
      messages,
    });
    const inputTokens = res.usage?.input_tokens ?? 0;
    const outputTokens = res.usage?.output_tokens ?? 0;
    return {
      text: textOf(res).trim(),
      usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
    };
  },
};
