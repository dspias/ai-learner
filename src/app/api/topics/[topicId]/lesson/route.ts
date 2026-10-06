import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { generateText } from "@/lib/llm";
import { getTopicWithContext, toPromptContext } from "@/server/topicContext";
import { lessonSystem, lessonPrompt } from "@/prompts/lesson";
import { touchTopicActivity } from "@/server/study";
import { QuotaExceededError, quotaMessage } from "@/server/usage";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { topicId } = await params;

    const topic = await getTopicWithContext(userId, topicId);
    if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ctx = toPromptContext(topic);
    const lessonMd = await generateText({
      system: lessonSystem,
      messages: [{ role: "user", content: lessonPrompt(ctx) }],
      maxTokens: 3500,
    }, { userId, feature: "lesson" });

    const generatedAt = new Date();
    await prisma.topic.update({
      where: { id: topic.id },
      data: { lessonMd, lessonGeneratedAt: generatedAt },
    });

    await touchTopicActivity(
      userId,
      { id: topic.id, goalId: topic.goalId, status: topic.status },
      { activity: "lesson", minutes: 3 },
    );

    return NextResponse.json({ lessonMd, generatedAt: generatedAt.toISOString() });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ error: quotaMessage(err.info), code: "quota_exceeded" }, { status: 402 });
    }
    console.error("lesson generation failed", err);
    return NextResponse.json(
      { error: "Failed to generate lesson. Check LLM_PROVIDER and its API key/model." },
      { status: 500 },
    );
  }
}
