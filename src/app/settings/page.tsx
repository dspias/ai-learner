import { prisma } from "@/lib/db";
import { requirePageUserId } from "@/lib/session";
import AppHeader from "@/components/AppHeader";
import LanguageSelect from "@/components/LanguageSelect";
import PlanManager from "@/components/PlanManager";
import { getQuotaStatus } from "@/server/usage";
import { PLAN_IDS, PLANS } from "@/config/plans";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const userId = await requirePageUserId();
  const { billing } = await searchParams;
  const [user, quota] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        defaultLanguage: true,
        stripeCustomerId: true,
        stripeStatus: true,
        stripeCurrentPeriodEnd: true,
      },
    }),
    getQuotaStatus(userId),
  ]);

  const plans = PLAN_IDS.map((id) => ({
    id,
    name: PLANS[id].name,
    tokenLimit: PLANS[id].tokenLimit,
    blurb: PLANS[id].blurb,
  }));

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-6 text-xl font-semibold">Settings</h1>

        {billing === "success" && (
          <div className="mb-6 rounded-md border border-green-600/40 bg-green-600/10 px-3 py-2 text-sm text-green-300">
            Payment received — your plan will update momentarily.
          </div>
        )}
        {billing === "cancel" && (
          <div className="mb-6 rounded-md border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm text-slate-300">
            Checkout canceled — no changes made.
          </div>
        )}

        <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Subscription
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Your plan sets how many LLM tokens you can use per month across lessons, the
            tutor, and quizzes.
          </p>
          <PlanManager
            currentPlan={quota.plan.id}
            plans={plans}
            used={quota.used}
            limit={quota.limit}
            periodEnd={quota.periodEnd.toISOString()}
            hasBilling={!!user?.stripeCustomerId}
            status={user?.stripeStatus ?? null}
            renewalDate={user?.stripeCurrentPeriodEnd ? user.stripeCurrentPeriodEnd.toISOString() : null}
          />
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Default language
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Used as the default for new goals. Each goal can override it, and the tutor always
            replies in the language you message it in.
          </p>
          <LanguageSelect
            initial={user?.defaultLanguage ?? "English"}
            endpoint="/api/profile"
            method="PUT"
            field="defaultLanguage"
            label="Profile default language"
          />
        </section>

        <p className="mt-4 text-xs text-slate-500">Signed in as {user?.email}</p>
      </main>
    </>
  );
}
