// Subscription plans. Token limits are per rolling period (periodDays).
// No payment processing — plans are assignable; this governs usage caps only.

export type PlanId = "free" | "pro" | "max";

export type Plan = {
  id: PlanId;
  name: string;
  tokenLimit: number; // total tokens (input + output) allowed per period
  periodDays: number;
  blurb: string;
  // Marketing display only — actual charges come from the Stripe Price.
  priceLabel: string;
  priceSuffix: string;
  popular?: boolean;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tokenLimit: 100_000,
    periodDays: 30,
    blurb: "Try it out — a few goals, lessons, and quizzes each month.",
    priceLabel: "$0",
    priceSuffix: "forever",
    features: [
      "100K tokens / month",
      "AI-generated topic maps",
      "Topic tutor & quizzes",
      "Progress & spaced-repetition reviews",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tokenLimit: 2_000_000,
    periodDays: 30,
    blurb: "Serious daily study across multiple goals.",
    priceLabel: "$12",
    priceSuffix: "per month",
    popular: true,
    features: [
      "2M tokens / month",
      "Everything in Free",
      "Multiple goals & longer tutor sessions",
      "Any language, per goal",
    ],
  },
  max: {
    id: "max",
    name: "Max",
    tokenLimit: 10_000_000,
    periodDays: 30,
    blurb: "Heavy use, long tutor sessions, lots of quizzes.",
    priceLabel: "$39",
    priceSuffix: "per month",
    features: [
      "10M tokens / month",
      "Everything in Pro",
      "Highest usage limits",
      "Priority for new features",
    ],
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function getPlan(id: string): Plan {
  return PLANS[id as PlanId] ?? PLANS.free;
}

export function isPlanId(id: string): id is PlanId {
  return id in PLANS;
}
