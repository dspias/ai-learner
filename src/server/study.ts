import { prisma } from "@/lib/db";
import type { SessionActivity } from "@prisma/client";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Records that the user did some studying on a topic: bumps the topic's
 * lastStudiedAt, advances not_started -> in_progress, and rolls the activity
 * into today's auto-tracked StudySession (creating one if needed). Best-effort:
 * never throws, so it can't break the primary request.
 */
export async function touchTopicActivity(
  userId: string,
  topic: { id: string; goalId: string; status: string },
  opts: { activity: SessionActivity; minutes: number },
): Promise<void> {
  try {
    const now = new Date();

    await prisma.topic.update({
      where: { id: topic.id },
      data: {
        lastStudiedAt: now,
        ...(topic.status === "not_started" ? { status: "in_progress" as const } : {}),
      },
    });

    const existing = await prisma.studySession.findFirst({
      where: { userId, startedAt: { gte: startOfToday() } },
      orderBy: { startedAt: "desc" },
    });

    let sessionId: string;
    if (existing) {
      const activity: SessionActivity =
        existing.activity === opts.activity ? existing.activity : "mixed";
      await prisma.studySession.update({
        where: { id: existing.id },
        data: { minutes: existing.minutes + opts.minutes, endedAt: now, activity },
      });
      sessionId = existing.id;
    } else {
      const created = await prisma.studySession.create({
        data: {
          userId,
          goalId: topic.goalId,
          startedAt: now,
          endedAt: now,
          minutes: opts.minutes,
          activity: opts.activity,
        },
      });
      sessionId = created.id;
    }

    await prisma.studySessionTopic.upsert({
      where: { sessionId_topicId: { sessionId, topicId: topic.id } },
      update: {},
      create: { sessionId, topicId: topic.id, userId },
    });
  } catch (err) {
    console.error("touchTopicActivity failed", err);
  }
}
