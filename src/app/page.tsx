import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import PricingSection from "@/components/marketing/PricingSection";

export const metadata: Metadata = {
  title: "AI Learner — structured learning on top of an LLM",
  description:
    "Turn any goal into a topic map with an AI tutor, quizzes, mastery tracking, and spaced-repetition reviews.",
};

const features = [
  {
    icon: "🗺️",
    title: "AI topic map",
    body: "Describe your goal and background. Get an editable milestone + topic tree with prerequisites — reorder, add, or trim before you start.",
  },
  {
    icon: "🧑‍🏫",
    title: "Tutor that remembers",
    body: "Each topic has its own tutor that knows your level, prerequisites, and past mistakes. It explains at your pace and asks check-in questions.",
  },
  {
    icon: "📝",
    title: "Quizzes with real grading",
    body: "Five mixed questions per topic — multiple choice, short answer, and coding — graded with feedback. Your mistakes feed future lessons.",
  },
  {
    icon: "📈",
    title: "Mastery & spaced review",
    body: "Mastery updates from recent quizzes. Learned topics come back for review on an expanding schedule so nothing slips away.",
  },
  {
    icon: "🌍",
    title: "Any language",
    body: "Set a language per goal. Lessons and quizzes follow it — and the tutor replies in whatever language you message it in.",
  },
  {
    icon: "📊",
    title: "A plan for today",
    body: "A dashboard with progress, streaks, what's due, and a time-boxed plan that fits your daily minutes — even after you miss a few days.",
  },
];

const steps = [
  { n: "1", title: "Set your goal", body: "Tell us where you are and where you want to be." },
  { n: "2", title: "Get your map", body: "Review and edit the AI-generated topic tree." },
  { n: "3", title: "Study & quiz", body: "Learn with the tutor, test yourself, fix mistakes." },
  { n: "4", title: "Track & review", body: "Watch mastery grow and get timely review nudges." },
];

export default async function LandingPage() {
  const session = await auth();
  const isAuthed = !!session?.user;

  return (
    <div className="min-h-screen">
      <MarketingHeader isAuthed={isAuthed} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] bg-gradient-to-b from-blue-600/20 via-blue-600/5 to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            Structured learning, powered by Claude & GPT
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            Stop learning in one <span className="text-blue-400">endless chat.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            AI Learner breaks your goal into a topic map — each topic with its own tutor,
            quizzes, notes, and mastery score. Always know what you&apos;ve studied, where
            you&apos;re weak, and what to review next.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={isAuthed ? "/dashboard" : "/register"}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium hover:bg-blue-500"
            >
              {isAuthed ? "Go to dashboard" : "Start learning free"}
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium hover:bg-slate-800"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            No credit card to start · Free plan included
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Everything a long chat can&apos;t give you</h2>
          <p className="mt-3 text-slate-400">
            Structure, memory, and progress — on top of the models you already trust.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition hover:border-slate-700"
            >
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-slate-800/70 bg-slate-900/20">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="mt-3 text-slate-400">From a vague goal to a daily study habit.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 font-semibold">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Simple, usage-based pricing</h2>
          <p className="mt-3 text-slate-400">
            Plans are metered in LLM tokens — the real cost of your lessons, tutor chats, and
            quizzes. Start free, upgrade when you need more.
          </p>
        </div>
        <div className="mt-12">
          <PricingSection isAuthed={isAuthed} />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-transparent p-10 text-center">
          <h2 className="text-3xl font-bold">Ready to learn with structure?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Create your first goal in minutes and let the AI draft your path.
          </p>
          <Link
            href={isAuthed ? "/dashboard" : "/register"}
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium hover:bg-blue-500"
          >
            {isAuthed ? "Go to dashboard" : "Start learning free"}
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
