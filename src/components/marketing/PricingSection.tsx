import Link from "next/link";
import { PLAN_IDS, PLANS } from "@/config/plans";

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 10a1 1 0 111.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Auth-aware pricing grid. Free→register/dashboard, paid→register/settings. */
export default function PricingSection({ isAuthed }: { isAuthed: boolean }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PLAN_IDS.map((id) => {
        const p = PLANS[id];
        const paid = id !== "free";
        const href = isAuthed ? (paid ? "/settings" : "/dashboard") : "/register";
        const cta = isAuthed ? (paid ? "Upgrade" : "Go to dashboard") : "Get started";

        return (
          <div
            key={id}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              p.popular
                ? "border-blue-500 bg-gradient-to-b from-blue-500/10 to-transparent shadow-lg shadow-blue-500/5"
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

            <Link
              href={href}
              className={`mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-medium ${
                p.popular
                  ? "bg-blue-600 hover:bg-blue-500"
                  : "border border-slate-700 hover:bg-slate-800"
              }`}
            >
              {cta}
            </Link>

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
  );
}
