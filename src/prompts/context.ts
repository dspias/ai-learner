import type { PromptContext } from "@/server/topicContext";

/** Shared learner/topic context block injected into lesson and tutor prompts. */
export function formatContextBlock(ctx: PromptContext): string {
  const prereqs =
    ctx.prerequisites.length > 0
      ? ctx.prerequisites
          .map((p) => `- ${p.title} (your mastery: ${p.mastery}/100)`)
          .join("\n")
      : "- (none)";

  const mistakes =
    ctx.mistakes.length > 0
      ? ctx.mistakes
          .map((m) => `- ${m.concept}${m.detail ? `: ${m.detail}` : ""}`)
          .join("\n")
      : "- (none recorded yet)";

  return [
    `Goal: ${ctx.goalTitle}`,
    `Course language: ${ctx.language}`,
    `Milestone: ${ctx.milestoneTitle}`,
    `Topic: ${ctx.topicTitle}${ctx.topicSummary ? ` — ${ctx.topicSummary}` : ""}`,
    `Learner's current mastery of this topic: ${ctx.mastery}/100`,
    `Learner's background: ${ctx.background || "(not specified)"}`,
    `Prerequisite topics and the learner's mastery of them:\n${prereqs}`,
    `The learner's past mistakes on this topic (address these):\n${mistakes}`,
  ].join("\n");
}
