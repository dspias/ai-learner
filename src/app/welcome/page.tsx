import Link from "next/link";
import { requirePageUserId } from "@/lib/session";
import { PLAN_IDS, PLANS } from "@/config/plans";
import ChoosePlan from "@/components/ChoosePlan";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  await requirePageUserId();

  const plans = PLAN_IDS.map((id) => ({
    id,
    name: PLANS[id].name,
    tokenLimit: PLANS[id].tokenLimit,
    blurb: PLANS[id].blurb,
    priceLabel: PLANS[id].priceLabel,
    priceSuffix: PLANS[id].priceSuffix,
    popular: PLANS[id].popular,
    features: PLANS[id].features,
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
          Welcome 🎉
        </span>
        <h1 className="mt-4 text-3xl font-bold">Choose a plan to get started</h1>
        <p className="mt-3 text-slate-400">
          Plans are metered in LLM tokens — the real cost of your lessons, tutor chats, and
          quizzes. Start free and upgrade anytime from Settings.
        </p>
      </div>

      <ChoosePlan plans={plans} />

      <p className="mt-10 text-center text-xs text-slate-500">
        You can change or cancel your plan whenever you like ·{" "}
        <Link href="/dashboard" className="hover:text-slate-300">
          Go to dashboard
        </Link>
      </p>
    </main>
  );
}
