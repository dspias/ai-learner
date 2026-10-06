import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { generateText } from "@/lib/llm";
import { getTopicWithContext, toPromptContext } from "@/server/topicContext";
import { tutorSystemPrompt } from "@/prompts/tutor";
import { touchTopicActivity } from "@/server/study";
import { QuotaExceededError, quotaMessage } from "@/server/usage";

const bodySchema = z.object({ message: z.string().min(1).max(8000) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { topicId } = await params;
    const { message } = bodySchema.parse(await req.json());

    const topic = await getTopicWithContext(userId, topicId);
    if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Persist the user's turn first, then read the full history so the LLM
    // context is always rebuilt server-side (we don't trust client history).
    await prisma.topicChatMessage.create({
      data: { userId, topicId, role: "user", content: message },
    });

    const history = await prisma.topicChatMessage.findMany({
      where: { topicId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });

    const reply = await generateText({
      system: tutorSystemPrompt(toPromptContext(topic)),
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      maxTokens: 1500,
    }, { userId, feature: "chat" });

    const assistant = await prisma.topicChatMessage.create({
      data: { userId, topicId, role: "assistant", content: reply },
    });

    await touchTopicActivity(
      userId,
      { id: topic.id, goalId: topic.goalId, status: topic.status },
      { activity: "chat", minutes: 2 },
    );

    return NextResponse.json({
      message: {
        id: assistant.id,
        role: "assistant",
        content: assistant.content,
        createdAt: assistant.createdAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ error: quotaMessage(err.info), code: "quota_exceeded" }, { status: 402 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }
    console.error("tutor chat failed", err);
    return NextResponse.json({ error: "Tutor failed to respond." }, { status: 500 });
  }
}
