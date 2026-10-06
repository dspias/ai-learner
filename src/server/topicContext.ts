import { prisma } from "@/lib/db";

/**
 * Loads a topic the user owns, along with everything the tutor/lesson prompts
 * need: its goal + background, milestone, prerequisites (with their mastery),
 * unresolved mistakes, and the user's note. Returns null if not found/owned.
 */
export async function getTopicWithContext(userId: string, topicId: string) {
  return prisma.topic.findFirst({
    where: { id: topicId, userId },
    include: {
      goal: { select: { id: true, title: true, background: true, language: true } },
      milestone: { select: { title: true } },
      prerequisites: {
        include: {
          prerequisite: {
            select: { id: true, title: true, masteryScore: true, status: true },
          },
        },
      },
      mistakes: {
        where: { resolved: false },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      note: true,
    },
  });
}

export type TopicWithContext = NonNullable<
  Awaited<ReturnType<typeof getTopicWithContext>>
>;

/** Flattens a TopicWithContext into the plain shape the prompt builders use. */
export function toPromptContext(topic: TopicWithContext) {
  return {
    topicTitle: topic.title,
    topicSummary: topic.summary ?? "",
    goalTitle: topic.goal.title,
    milestoneTitle: topic.milestone.title,
    language: topic.goal.language ?? "English",
    background: topic.goal.background ?? "",
    mastery: topic.masteryScore,
    prerequisites: topic.prerequisites.map((p) => ({
      title: p.prerequisite.title,
      mastery: p.prerequisite.masteryScore,
    })),
    mistakes: topic.mistakes.map((m) => ({
      concept: m.concept,
      detail: m.detail ?? "",
    })),
  };
}

export type PromptContext = ReturnType<typeof toPromptContext>;
