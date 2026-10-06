import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { generateStructured } from "@/lib/llm";
import { getTopicWithContext, toPromptContext } from "@/server/topicContext";
import { gradingSystem, gradingPrompt } from "@/prompts/grading";
import { gradedSchema, submitAnswersSchema } from "@/schemas/quiz";
import { touchTopicActivity } from "@/server/study";
import { computeMastery } from "@/lib/mastery";
import { applyQuizResult, isDueForReview } from "@/lib/scheduling";
import { QuotaExceededError, quotaMessage } from "@/server/usage";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { attemptId } = await params;
    const { answers } = submitAnswersSchema.parse(await req.json());

    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      include: { items: { orderBy: { position: "asc" } } },
    });
    if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (attempt.items.some((it) => it.isCorrect !== null)) {
      return NextResponse.json({ error: "This quiz was already graded." }, { status: 409 });
    }

    const topic = await getTopicWithContext(userId, attempt.topicId);
    if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const ctx = toPromptContext(topic);

    const now = new Date();
    // Was this quiz taken as a due review (vs. first-time learning)?
    const due = isDueForReview(
      { status: topic.status, nextReviewAt: topic.nextReviewAt },
      now,
    );

    const answerById = new Map(answers.map((a) => [a.itemId, a.answer]));

    // Grade MCQ deterministically; collect free-response items for the LLM.
    type Result = {
      itemId: string;
      userAnswer: string;
      isCorrect: boolean;
      feedback: string;
      concept: string;
    };
    const results = new Map<string, Result>();
    const freeItems: {
      index: number;
      type: string;
      question: string;
      expectedAnswer: string;
      userAnswer: string;
    }[] = [];

    for (const it of attempt.items) {
      const userAnswer = answerById.get(it.id) ?? "";
      if (it.type === "mcq") {
        const correct = norm(userAnswer) === norm(it.correctAnswer ?? "");
        results.set(it.id, {
          itemId: it.id,
          userAnswer,
          isCorrect: correct,
          feedback: correct
            ? "Correct."
            : `Not quite. The correct answer is: ${it.correctAnswer}.`,
          concept: it.concept ?? "",
        });
      } else {
        freeItems.push({
          index: it.position,
          type: it.type,
          question: it.question,
          expectedAnswer: it.correctAnswer ?? "",
          userAnswer,
        });
      }
    }

    if (freeItems.length > 0) {
      const graded = await generateStructured({
        system: gradingSystem,
        prompt: gradingPrompt(ctx, freeItems),
        schema: gradedSchema,
        maxTokens: 2500,
      }, { userId, feature: "grade" });
      const byIndex = new Map(graded.items.map((g) => [g.index, g]));
      for (const it of attempt.items) {
        if (it.type === "mcq") continue;
        const g = byIndex.get(it.position);
        const userAnswer = answerById.get(it.id) ?? "";
        results.set(it.id, {
          itemId: it.id,
          userAnswer,
          isCorrect: g?.isCorrect ?? false,
          feedback: g?.feedback || (g?.isCorrect ? "Correct." : "Incorrect."),
          concept: (it.concept || g?.misconception) ?? "",
        });
      }
    }

    const numCorrect = attempt.items.filter((it) => results.get(it.id)?.isCorrect).length;
    const score = Math.round((numCorrect / attempt.items.length) * 100);

    await prisma.$transaction(async (tx) => {
      for (const it of attempt.items) {
        const r = results.get(it.id)!;
        await tx.quizItem.update({
          where: { id: it.id },
          data: { userAnswer: r.userAnswer, isCorrect: r.isCorrect, feedback: r.feedback },
        });

        if (!r.isCorrect) {
          await tx.mistake.create({
            data: {
              userId,
              topicId: attempt.topicId,
              quizItemId: it.id,
              concept: r.concept || "general",
              detail: r.feedback,
            },
          });
        } else if (r.concept) {
          // Answering a concept correctly clears earlier mistakes on it.
          await tx.mistake.updateMany({
            where: { userId, topicId: attempt.topicId, concept: r.concept, resolved: false },
            data: { resolved: true },
          });
        }
      }
      await tx.quizAttempt.update({
        where: { id: attempt.id },
        data: { numCorrect, score, isReview: due },
      });
    });

    await touchTopicActivity(
      userId,
      { id: topic.id, goalId: topic.goalId, status: topic.status },
      { activity: "quiz", minutes: 5 },
    );

    // Recompute mastery from all graded attempts, then apply the spaced-
    // repetition transition. This runs last so it wins over touchTopicActivity.
    const gradedAttempts = await prisma.quizAttempt.findMany({
      where: { topicId: attempt.topicId, userId, items: { some: { isCorrect: { not: null } } } },
      select: { score: true, createdAt: true },
    });
    const newMastery = computeMastery(gradedAttempts);
    const sched = applyQuizResult(
      {
        status: topic.status,
        masteryScore: topic.masteryScore,
        reviewStage: topic.reviewStage,
        nextReviewAt: topic.nextReviewAt,
      },
      newMastery,
      score,
      now,
    );
    await prisma.topic.update({
      where: { id: topic.id },
      data: {
        masteryScore: sched.masteryScore,
        status: sched.status,
        reviewStage: sched.reviewStage,
        nextReviewAt: sched.nextReviewAt,
        lastStudiedAt: now,
      },
    });

    return NextResponse.json({
      score,
      numCorrect,
      numQuestions: attempt.items.length,
      mastery: sched.masteryScore,
      status: sched.status,
      nextReviewAt: sched.nextReviewAt ? sched.nextReviewAt.toISOString() : null,
      results: attempt.items.map((it) => {
        const r = results.get(it.id)!;
        return {
          id: it.id,
          position: it.position,
          type: it.type,
          question: it.question,
          options: it.options,
          userAnswer: r.userAnswer,
          correctAnswer: it.correctAnswer,
          isCorrect: r.isCorrect,
          feedback: r.feedback,
          concept: r.concept,
        };
      }),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ error: quotaMessage(err.info), code: "quota_exceeded" }, { status: 402 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
    }
    console.error("quiz grading failed", err);
    return NextResponse.json({ error: "Failed to grade quiz." }, { status: 500 });
  }
}
