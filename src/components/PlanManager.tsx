"use client";

import { useState } from "react";

type PlanView = { id: string; name: string; tokenLimit: number; blurb: string };

export default function PlanManager({
  currentPlan,
  plans,
  used,
  limit,
  periodEnd,
  hasBilling,
  status,
  renewalDate,
}: {
  currentPlan: string;
  plans: PlanView[];
  used: number;
  limit: number;
  periodEnd: string;
  hasBilling: boolean;
  status: string | null;
  renewalDate: string | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500";

  // POST to a billing endpoint and redirect to the returned Stripe URL.
  async function go(key: string, endpoint: string, body?: object) {
    setError(null);
    setBusy(key);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Something went wrong");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
      setBusy(null);
    }
  }

  return (
    <div>
      {/* Usage this period */}
      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-slate-300">Tokens used this period</span>
          <span className="text-slate-400">
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Resets {new Date(periodEnd).toLocaleDateString()}
          {status && renewalDate && (
            <> · subscription {status}, renews {new Date(renewalDate).toLocaleDateString()}</>
          )}
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Plans */}
      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((p) => {
          const current = p.id === currentPlan;
          const paid = p.id !== "free";
          return (
            <div
              key={p.id}
              className={`rounded-lg border p-4 ${
                current ? "border-blue-500 bg-blue-500/10" : "border-slate-800 bg-slate-900/40"
              }`}
            >
              <div className="font-medium">{p.name}</div>
              <div className="mt-1 text-sm text-slate-300">
                {p.tokenLimit.toLocaleString()} tokens/mo
              </div>
              <p className="mt-1 text-xs text-slate-500">{p.blurb}</p>

              {current ? (
                <button
                  disabled
                  className="mt-3 w-full cursor-default rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-400"
                >
                  Current plan
                </button>
              ) : paid ? (
                <button
                  disabled={busy !== null}
                  onClick={() => go(p.id, "/api/checkout", { plan: p.id })}
                  className="mt-3 w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
                >
                  {busy === p.id ? "Starting…" : "Upgrade"}
                </button>
              ) : (
                <button
                  disabled={busy !== null || !hasBilling}
                  onClick={() => go("portal", "/api/billing/portal")}
                  title={hasBilling ? "" : "No active subscription"}
                  className="mt-3 w-full rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  Downgrade
                </button>
              )}
            </div>
          );
        })}
      </div>

      {hasBilling && (
        <button
          onClick={() => go("portal", "/api/billing/portal")}
          disabled={busy !== null}
          className="mt-4 rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {busy === "portal" ? "Opening…" : "Manage billing"}
        </button>
      )}
    </div>
  );
}
