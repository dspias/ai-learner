"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

/** Adjusts the "Today" plan: available minutes and missed-days catch-up. */
export default function TodayPlanControls({
  minutes,
  missedDays,
}: {
  minutes: number;
  missedDays: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [min, setMin] = useState(String(minutes));
  const [missed, setMissed] = useState(String(missedDays));

  function apply() {
    const params = new URLSearchParams();
    params.set("min", String(Math.max(5, Number(min) || minutes)));
    params.set("missed", String(Math.max(0, Number(missed) || 0)));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 text-sm">
      <div>
        <label className="mb-1 block text-xs text-slate-400">Minutes today</label>
        <input
          type="number"
          min={5}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-400">Days missed</label>
        <input
          type="number"
          min={0}
          value={missed}
          onChange={(e) => setMissed(e.target.value)}
          className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 outline-none focus:border-blue-500"
        />
      </div>
      <button
        onClick={apply}
        className="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
      >
        Update plan
      </button>
    </div>
  );
}
