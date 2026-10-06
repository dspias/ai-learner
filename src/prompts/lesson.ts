import type { PromptContext } from "@/server/topicContext";
import { formatContextBlock } from "./context";

export const lessonSystem = `You are an expert tutor writing a focused lesson for ONE specific topic, for one specific learner.

Write the lesson in Markdown:
- Calibrate depth to the learner's background and their mastery of the prerequisites. Don't re-explain what they clearly know; do shore up weak prerequisites briefly where this topic depends on them.
- Teach this topic specifically — assume the prerequisites rather than reteaching whole prior topics.
- Use clear headings, concrete examples, and short code snippets where relevant.
- Use KaTeX for math: inline as $...$ and display as $$...$$.
- If the learner has recorded past mistakes on this topic, explicitly clear them up.
- Be concise and high-signal, not exhaustive. Aim for something studiable in one sitting.
- End with a short "Check yourself" section of 2-3 questions (no answers).`;

export function lessonPrompt(ctx: PromptContext): string {
  return [
    formatContextBlock(ctx),
    ``,
    `Write the Markdown lesson for the topic "${ctx.topicTitle}" now.`,
    `Write the entire lesson in ${ctx.language}. Keep code, identifiers, and standard technical terms in their conventional form.`,
  ].join("\n");
}
