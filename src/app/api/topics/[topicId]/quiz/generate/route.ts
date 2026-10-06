import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { generateStructured } from "@/lib/llm";
import { getTopicWithContext, toPromptContext } from "@/server/topicContext";
import { quizSystem, quizPrompt } from "@/prompts/quiz";
import { generatedQuizSchema } from "@/schemas/quiz";
import { QUIZ_QUESTION_COUNT } from "@/config/learning";
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

    const quiz = await generateStructured({
      system: quizSystem,
      prompt: quizPrompt(toPromptContext(topic), QUIZ_QUESTION_COUNT),
      schema: generatedQuizSchema,
      maxTokens: 4000,
    }, { userId, feature: "quiz" });

    // Normalize MCQ options and persist the attempt + items (answers stay
    // server-side; they are not returned to the client until grading).
    const attempt = await prisma.$transaction(async (tx) => {
      const a = await tx.quizAttempt.create({
        data: { userId, topicId, numQuestions: quiz.questions.length, isReview: false },
      });
      for (let i = 0; i < quiz.questions.length; i++) {
        const q = quiz.questions[i];
        const options =
          q.type === "mcq" && q.options.length > 0 ? (q.options as Prisma.InputJsonValue) : undefined;
        await tx.quizItem.create({
          data: {
            userId,
            attemptId: a.id,
            topicId,
            position: i,
            type: q.type,
            question: q.question,
            options,
            correctAnswer: q.correctAnswer,
            concept: q.concept,
          },
        });
      }
      return a;
    });

    const items = await prisma.quizItem.findMany({
      where: { attemptId: attempt.id },
      orderBy: { position: "asc" },
      select: { id: true, type: true, question: true, options: true },
    });

    return NextResponse.json({ attemptId: attempt.id, questions: items });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ error: quotaMessage(err.info), code: "quota_exceeded" }, { status: 402 });
    }
    console.error("quiz generation failed", err);
    return NextResponse.json(
      { error: "Failed to generate quiz. Check LLM_PROVIDER and its API key/model." },
      { status: 500 },
    );
  }
}
