"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PlanView = {
  id: string;
  name: string;
  tokenLimit: number;
  blurb: string;
  priceLabel: string;
  priceSuffix: string;
  popular?: boolean;
  features: string[];
};

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 10a1 1 0 111.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
    </svg>
  );
}

/** Onboarding plan picker: Free -> dashboard, paid -> Stripe checkout. */
export default function ChoosePlan({ plans }: { plans: PlanView[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: PlanView) {
    setError(null);
    if (plan.id === "free") {
      setBusy(plan.id);
      router.push("/dashboard");
      return;
    }
    setBusy(plan.id);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message ?? "Could not start checkout");
      setBusy(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const paid = p.id !== "free";
          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                p.popular
                  ? "border-blue-500 bg-gradient-to-b from-blue-500/10 to-transparent"
                  : "border-slate-800 bg-slate-900/40"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{p.blurb}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{p.priceLabel}</span>
                <span className="text-sm text-slate-400">/ {p.priceSuffix}</span>
              </div>

              <button
                onClick={() => choose(p)}
                disabled={busy !== null}
                className={`mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-medium ${
                  p.popular ? "bg-blue-600 hover:bg-blue-500" : "border border-slate-700 hover:bg-slate-800"
                } disabled:opacity-60`}
              >
                {busy === p.id
                  ? paid
                    ? "Starting checkout…"
                    : "Continuing…"
                  : paid
                    ? `Choose ${p.name}`
                    : "Start free"}
              </button>

              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <CheckIcon />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => router.push("/dashboard")}
          disabled={busy !== null}
          className="text-sm text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline disabled:opacity-60"
        >
          Skip for now — I&apos;ll decide later
        </button>
      </div>
    </div>
  );
}
