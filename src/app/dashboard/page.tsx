import Link from "next/link";
import { requirePageUserId } from "@/lib/session";
import { getStudyStreak, listGoalsWithProgress } from "@/server/dashboard";
import { getQuotaStatus } from "@/server/usage";
import AppHeader from "@/components/AppHeader";

export const dynamic = "force-dynamic";

function Bar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export default async function DashboardPage() {
  const userId = await requirePageUserId();
  const [streak, goals, quota] = await Promise.all([
    getStudyStreak(userId),
    listGoalsWithProgress(userId),
    getQuotaStatus(userId),
  ]);
  const totalDue = goals.reduce((s, g) => s + g.due, 0);
  const usedPct =
    quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <Link
            href="/goals/new"
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500"
          >
            + New goal
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-5 py-3">
            <div className="text-2xl font-semibold">🔥 {streak}</div>
            <div className="text-xs text-slate-400">day streak</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-5 py-3">
            <div className="text-2xl font-semibold">{totalDue}</div>
            <div className="text-xs text-slate-400">topics due for review</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-5 py-3">
            <div className="text-2xl font-semibold">{goals.length}</div>
            <div className="text-xs text-slate-400">goals</div>
          </div>
          <Link
            href="/settings"
            className="rounded-lg border border-slate-800 bg-slate-900/40 px-5 py-3 hover:border-slate-600"
          >
            <div className="text-2xl font-semibold">
              {usedPct}
              <span className="text-base text-slate-400">%</span>
            </div>
            <div className="text-xs text-slate-400">
              {quota.plan.name} tokens used
            </div>
          </Link>
        </div>

        {goals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center text-slate-400">
            <p className="mb-3">No goals yet.</p>
            <Link href="/goals/new" className="text-blue-400 hover:underline">
              Create your first goal
            </Link>{" "}
            and the AI will draft an editable topic map.
          </div>
        ) : (
          <ul className="space-y-3">
            {goals.map((g) => (
              <li key={g.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Link href={`/goals/${g.id}`} className="font-medium hover:underline">
                    {g.title}
                  </Link>
                  <span className="text-sm text-slate-400">{g.pct}%</span>
                </div>
                <Bar pct={g.pct} />
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {g.learned}/{g.total} topics learned
                    {g.due > 0 && <span className="text-red-400"> · {g.due} due</span>}
                    {` · ${g.language} · ${g.dailyMinutes} min/day`}
                  </span>
                  <Link href={`/goals/${g.id}`} className="text-blue-400 hover:underline">
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
