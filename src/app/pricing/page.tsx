import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import PricingSection from "@/components/marketing/PricingSection";

export const metadata: Metadata = {
  title: "Pricing — AI Learner",
  description: "Usage-based plans metered in LLM tokens. Start free, upgrade anytime.",
};

const faqs = [
  {
    q: "What's a token?",
    a: "Tokens are how LLMs measure text — roughly ¾ of a word each. Every lesson, tutor reply, and quiz uses some. Your plan sets how many you get per month.",
  },
  {
    q: "What happens when I run out?",
    a: "AI features pause until your period resets or you upgrade. Your goals, notes, progress, and past quizzes are always available.",
  },
  {
    q: "Can I change plans?",
    a: "Yes — upgrade or cancel anytime from Settings. Billing is handled securely by Stripe; we never store your card.",
  },
  {
    q: "Do you support Claude and GPT?",
    a: "Yes. The app runs on Anthropic or OpenAI models and is configured by the operator — your experience is the same either way.",
  },
];

export default async function PricingPage() {
  const session = await auth();
  const isAuthed = !!session?.user;

  return (
    <div className="min-h-screen">
      <MarketingHeader isAuthed={isAuthed} />

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold">Pricing</h1>
          <p className="mt-3 text-slate-400">
            Plans are metered in LLM tokens — the real cost of your lessons, tutor chats, and
            quizzes. Start free, upgrade when you need more.
          </p>
        </div>
        <div className="mt-12">
          <PricingSection isAuthed={isAuthed} />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="mb-6 text-center text-2xl font-bold">Questions</h2>
        <div className="space-y-3">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="font-medium">{f.q}</h3>
              <p className="mt-2 text-sm text-slate-400">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
