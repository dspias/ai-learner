import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageUserId } from "@/lib/session";
import { getTopicWithContext } from "@/server/topicContext";
import AppHeader from "@/components/AppHeader";
import LessonPanel from "@/components/LessonPanel";
import TutorChat from "@/components/TutorChat";
import NotesEditor from "@/components/NotesEditor";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  learned: "Learned",
  needs_review: "Needs review",
};
const statusColor: Record<string, string> = {
  not_started: "text-slate-400",
  in_progress: "text-amber-400",
  learned: "text-green-400",
  needs_review: "text-red-400",
};

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const userId = await requirePageUserId();
  const { topicId } = await params;

  const topic = await getTopicWithContext(userId, topicId);
  if (!topic) notFound();

  const messages = await prisma.topicChatMessage.findMany({
    where: { topicId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true },
  });

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-6">
        <Link
          href={`/goals/${topic.goalId}`}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← {topic.goal.title}
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{topic.title}</h1>
            <p className="text-sm text-slate-400">
              {topic.milestone.title}
              {topic.summary ? ` · ${topic.summary}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <div className={statusColor[topic.status]}>{statusLabel[topic.status]}</div>
              <div className="text-slate-500">mastery {topic.masteryScore}/100</div>
              {topic.nextReviewAt && (
                <div className="text-slate-500">
                  review {new Date(topic.nextReviewAt).toLocaleDateString()}
                </div>
              )}
            </div>
            <Link
              href={`/topics/${topic.id}/quiz`}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500"
            >
              Take a quiz
            </Link>
          </div>
        </div>

        {/* Context strip */}
        <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
            <span className="font-semibold text-slate-300">Prerequisites: </span>
            {topic.prerequisites.length === 0
              ? "none"
              : topic.prerequisites
                  .map((p) => `${p.prerequisite.title} (${p.prerequisite.masteryScore})`)
                  .join(", ")}
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
            <span className="font-semibold text-slate-300">Open mistakes: </span>
            {topic.mistakes.length === 0
              ? "none recorded yet"
              : topic.mistakes.map((m) => m.concept).join(", ")}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <LessonPanel
              topicId={topic.id}
              initialLessonMd={topic.lessonMd}
              initialGeneratedAt={
                topic.lessonGeneratedAt ? topic.lessonGeneratedAt.toISOString() : null
              }
            />
            <NotesEditor topicId={topic.id} initialMd={topic.note?.contentMd ?? ""} />
          </div>
          <TutorChat topicId={topic.id} initialMessages={messages} />
        </div>
      </main>
    </>
  );
}
