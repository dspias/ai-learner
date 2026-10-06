import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { saveGoalSchema } from "@/schemas/topicTree";

export async function GET() {
  try {
    const userId = await requireUserId();
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { milestones: true, topics: true } } },
    });
    return NextResponse.json({ goals });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("list goals failed", err);
    return NextResponse.json({ error: "Failed to list goals" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = saveGoalSchema.parse(await req.json());

    const goalId = await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.create({
        data: {
          userId,
          title: input.title,
          background: input.background,
          language: input.language,
          dailyMinutes: input.dailyMinutes,
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
        },
      });

      // key -> created topic id, across the whole tree.
      const keyToTopicId = new Map<string, string>();
      // Defer prereq edges until all topics exist.
      const prereqEdges: { topicKey: string; prereqKey: string }[] = [];

      for (let mi = 0; mi < input.milestones.length; mi++) {
        const m = input.milestones[mi];
        const milestone = await tx.milestone.create({
          data: {
            userId,
            goalId: goal.id,
            title: m.title,
            description: m.description || null,
            position: mi,
          },
        });

        for (let ti = 0; ti < m.topics.length; ti++) {
          const t = m.topics[ti];
          const topic = await tx.topic.create({
            data: {
              userId,
              goalId: goal.id,
              milestoneId: milestone.id,
              title: t.title,
              summary: t.summary || null,
              position: ti,
            },
          });
          keyToTopicId.set(t.key, topic.id);
          for (const pk of t.prerequisiteKeys) {
            prereqEdges.push({ topicKey: t.key, prereqKey: pk });
          }
        }
      }

      const prereqRows = prereqEdges
        .map((e) => ({
          topicId: keyToTopicId.get(e.topicKey),
          prerequisiteTopicId: keyToTopicId.get(e.prereqKey),
        }))
        .filter(
          (r): r is { topicId: string; prerequisiteTopicId: string } =>
            !!r.topicId && !!r.prerequisiteTopicId && r.topicId !== r.prerequisiteTopicId,
        )
        .map((r) => ({ ...r, userId }));

      if (prereqRows.length > 0) {
        await tx.topicPrerequisite.createMany({ data: prereqRows, skipDuplicates: true });
      }

      return goal.id;
    });

    return NextResponse.json({ goalId });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid goal data", issues: err.issues }, { status: 400 });
    }
    console.error("save goal failed", err);
    return NextResponse.json({ error: "Failed to save goal" }, { status: 500 });
  }
}
