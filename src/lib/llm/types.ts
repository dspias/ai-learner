export type ChatMessage = { role: "user" | "assistant"; content: string };

export type CompleteOptions = {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
};

export type ProviderId = "anthropic" | "openai";

export type UsageTokens = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type CompleteResult = { text: string; usage: UsageTokens };

/** A chat-completion provider. `model` is resolved from env per provider. */
export interface LlmProvider {
  id: ProviderId;
  complete(model: string, opts: CompleteOptions): Promise<CompleteResult>;
}
