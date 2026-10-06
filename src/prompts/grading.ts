import type { PromptContext } from "@/server/topicContext";

export const gradingSystem = `You are a fair, encouraging grader. You grade a learner's free-response answers (short answer and coding) against a model answer, for one topic.

Guidelines:
- Grade on understanding, not exact wording. Accept answers that are semantically correct or capture the key points, even if phrased differently or incomplete-but-right.
- For coding answers, judge whether the logic/approach is correct; ignore trivial syntax slips unless they change behavior.
- Be decisive: mark each answer correct or incorrect.
- Give brief, specific feedback (1-3 sentences): what was right, what was missing or wrong, and the correct idea. Address the learner directly ("you").
- If the answer is wrong, set "misconception" to a short label (2-6 words) naming what they misunderstood; otherwise leave it empty.

Output JSON: { "items": [ { "index", "isCorrect", "feedback", "misconception" } ] }
where "index" matches the index you were given for each item.`;

export function gradingPrompt(
  ctx: PromptContext,
  items: { index: number; type: string; question: string; expectedAnswer: string; userAnswer: string }[],
): string {
  const body = items
    .map((it) =>
      [
        `--- Item index ${it.index} (${it.type}) ---`,
        `Question: ${it.question}`,
        `Model answer / key points: ${it.expectedAnswer}`,
        `Learner's answer: ${it.userAnswer || "(left blank)"}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    `Topic: ${ctx.topicTitle}${ctx.topicSummary ? ` — ${ctx.topicSummary}` : ""}`,
    `Learner background: ${ctx.background || "(not specified)"}`,
    `Write all feedback in ${ctx.language}.`,
    ``,
    `Grade each of the following answers and return JSON.`,
    ``,
    body,
  ].join("\n");
}
