import { prisma } from "@/lib/db";
import type { PlanTopic } from "@/lib/planner";
import { computeStreak } from "@/lib/streak";
import { meanMastery, learnedCount } from "@/lib/progress";
import { isDueForReview, type TopicStatus } from "@/lib/scheduling";

/** Consecutive-day study streak for a user (from sessions with minutes > 0). */
export async function getStudyStreak(userId: string, now = new Date()): Promise<number> {
  const sessions = await prisma.studySession.findMany({
    where: { userId, minutes: { gt: 0 } },
    select: { startedAt: true },
  });
  return computeStreak(
    sessions.map((s) => s.startedAt),
    now,
  );
}

type MilestoneWithTopics = {
  position: number;
  topics: {
    id: string;
    title: string;
    position: number;
    status: TopicStatus;
    masteryScore: number;
    nextReviewAt: Date | null;
    prerequisites: { prerequisiteTopicId: string }[];
  }[];
};

/** Flatten fetched milestones+topics into the planner's PlanTopic shape. */
export function buildPlanTopics(milestones: MilestoneWithTopics[]): PlanTopic[] {
  const out: PlanTopic[] = [];
  for (const m of milestones) {
    for (const t of m.topics) {
      out.push({
        id: t.id,
        title: t.title,
        milestonePosition: m.position,
        position: t.position,
        status: t.status,
        masteryScore: t.masteryScore,
        nextReviewAt: t.nextReviewAt,
        prerequisiteIds: t.prerequisites.map((p) => p.prerequisiteTopicId),
      });
    }
  }
  return out;
}

/** Goals with summary progress for the dashboard overview. */
export async function listGoalsWithProgress(userId: string, now = new Date()) {
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      language: true,
      dailyMinutes: true,
      targetDate: true,
      topics: { select: { status: true, masteryScore: true, nextReviewAt: true } },
    },
  });

  return goals.map((g) => ({
    id: g.id,
    title: g.title,
    language: g.language,
    dailyMinutes: g.dailyMinutes,
    targetDate: g.targetDate,
    pct: meanMastery(g.topics),
    learned: learnedCount(g.topics),
    total: g.topics.length,
    due: g.topics.filter((t) =>
      isDueForReview({ status: t.status, nextReviewAt: t.nextReviewAt }, now),
    ).length,
  }));
}
