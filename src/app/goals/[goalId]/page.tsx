import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageUserId } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import LanguageSelect from "@/components/LanguageSelect";
import TodayPlanControls from "@/components/TodayPlanControls";
import { buildPlanTopics, getStudyStreak } from "@/server/dashboard";
import { meanMastery, learnedCount } from "@/lib/progress";
import { dueReviews, weakestTopics, buildTodayPlan } from "@/lib/planner";

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

function Bar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export default async function GoalPage({
  params,
  searchParams,
}: {
  params: Promise<{ goalId: string }>;
  searchParams: Promise<{ min?: string; missed?: string }>;
}) {
  const userId = await requirePageUserId();
  const { goalId } = await params;
  const sp = await searchParams;

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: {
      milestones: {
        orderBy: { position: "asc" },
        include: {
          topics: {
            orderBy: { position: "asc" },
            include: { prerequisites: { include: { prerequisite: { select: { title: true } } } } },
          },
        },
      },
    },
  });
  if (!goal) notFound();

  const now = new Date();
  const planTopics = buildPlanTopics(goal.milestones);
  const overallPct = meanMastery(planTopics);
  const learned = learnedCount(planTopics);
  const total = planTopics.length;

  const minutes = clamp(Number(sp.min) || goal.dailyMinutes, 5, 600);
  const missedDays = clamp(Number(sp.missed) || 0, 0, 60);

  const reviews = dueReviews(planTopics, now);
  const weakest = weakestTopics(planTopics);
  const plan = buildTodayPlan(planTopics, minutes, missedDays, now);
  const streak = await getStudyStreak(userId, now);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-200">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{goal.title}</h1>
        <p className="mb-4 text-sm text-slate-400">
          {goal.dailyMinutes} min/day
          {goal.targetDate ? ` · target ${new Date(goal.targetDate).toLocaleDateString()}` : ""}
          {` · language: ${goal.language} · 🔥 ${streak}-day streak`}
        </p>

        {/* Overall progress */}
        <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">Overall progress</span>
            <span className="text-slate-400">
              {overallPct}% · {learned}/{total} learned
            </span>
          </div>
          <Bar pct={overallPct} />
        </section>

        {/* Today plan */}
        <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Today ({plan.totalMinutes}/{minutes} min)
            </h2>
            <TodayPlanControls minutes={minutes} missedDays={missedDays} />
          </div>
          {missedDays > 0 && (
            <p className="mb-2 text-xs text-amber-400">
              Catch-up: you missed {missedDays} day{missedDays === 1 ? "" : "s"} — clear the due
              reviews first.
            </p>
          )}
          {plan.items.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nothing scheduled. {reviews.length === 0 ? "No reviews due" : ""} — start a new topic
              below or come back when reviews are due.
            </p>
          ) : (
            <ol className="space-y-2">
              {plan.items.map((it, i) => (
                <li
                  key={it.topicId + i}
                  className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
                >
                  <span>
                    <span
                      className={
                        it.kind === "review" ? "text-red-300" : "text-blue-300"
                      }
                    >
                      {it.kind === "review" ? "Review" : "Learn"}
                    </span>{" "}
                    {it.title}
                    {it.overBudget && (
                      <span className="ml-2 text-xs text-amber-400">(over budget)</span>
                    )}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{it.minutes} min</span>
                    <Link
                      href={
                        it.kind === "review"
                          ? `/topics/${it.topicId}/quiz`
                          : `/topics/${it.topicId}`
                      }
                      className="text-blue-400 hover:underline"
                    >
                      {it.kind === "review" ? "Quiz" : "Study"}
                    </Link>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Due reviews + weakest */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Due for review ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing due right now.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {reviews.map((t) => (
                  <li key={t.id} className="flex items-center justify-between">
                    <Link href={`/topics/${t.id}`} className="text-blue-300 hover:underline">
                      {t.title}
                    </Link>
                    <span className="text-xs text-slate-500">
                      due {t.nextReviewAt ? new Date(t.nextReviewAt).toLocaleDateString() : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Weakest topics
            </h2>
            {weakest.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing studied yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {weakest.map((t) => (
                  <li key={t.id} className="flex items-center justify-between">
                    <Link href={`/topics/${t.id}`} className="text-blue-300 hover:underline">
                      {t.title}
                    </Link>
                    <span className="text-xs text-slate-500">mastery {t.masteryScore}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Language */}
        <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <LanguageSelect
            initial={goal.language}
            endpoint={`/api/goals/${goal.id}`}
            method="PATCH"
            field="language"
            label="Goal language"
          />
        </div>

        {/* Topic map */}
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Topic map
        </h2>
        <div className="space-y-5">
          {goal.milestones.map((m) => {
            const mPct = meanMastery(m.topics);
            return (
              <section key={m.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium">{m.title}</h3>
                  <span className="text-xs text-slate-400">{mPct}%</span>
                </div>
                <Bar pct={mPct} />
                {m.description && <p className="mt-2 text-sm text-slate-400">{m.description}</p>}
                <ul className="mt-3 space-y-2">
                  {m.topics.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start justify-between rounded-md border border-slate-800 bg-slate-950/40 p-3"
                    >
                      <div>
                        <Link
                          href={`/topics/${t.id}`}
                          className="font-medium text-blue-300 hover:underline"
                        >
                          {t.title}
                        </Link>
                        {t.summary && <div className="text-sm text-slate-400">{t.summary}</div>}
                        {t.prerequisites.length > 0 && (
                          <div className="mt-1 text-xs text-slate-500">
                            Prereqs: {t.prerequisites.map((p) => p.prerequisite.title).join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 text-right text-xs">
                        <div className={statusColor[t.status]}>{statusLabel[t.status]}</div>
                        <div className="text-slate-500">mastery {t.masteryScore}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
