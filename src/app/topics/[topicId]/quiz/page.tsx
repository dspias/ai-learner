import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageUserId } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import QuizRunner from "@/components/QuizRunner";

export const dynamic = "force-dynamic";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const userId = await requirePageUserId();
  const { topicId } = await params;

  const topic = await prisma.topic.findFirst({
    where: { id: topicId, userId },
    select: { id: true, title: true, goalId: true },
  });
  if (!topic) notFound();

  const attempts = await prisma.quizAttempt.findMany({
    where: { topicId, userId, items: { some: { isCorrect: { not: null } } } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, score: true, numCorrect: true, numQuestions: true, createdAt: true },
  });

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-6">
        <Link
          href={`/topics/${topic.id}`}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← {topic.title}
        </Link>
        <h1 className="mb-6 mt-2 text-xl font-semibold">Quiz · {topic.title}</h1>

        <QuizRunner topicId={topic.id} />

        {attempts.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Past attempts
            </h2>
            <ul className="space-y-2">
              {attempts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm"
                >
                  <span>{new Date(a.createdAt).toLocaleString()}</span>
                  <span className="text-slate-300">
                    {a.score}% · {a.numCorrect}/{a.numQuestions}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
