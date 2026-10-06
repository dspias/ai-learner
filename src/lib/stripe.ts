import Stripe from "stripe";
import type { PlanId } from "@/config/plans";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

const PLAN_PRICE_ENV: Record<Exclude<PlanId, "free">, string> = {
  pro: "STRIPE_PRICE_PRO",
  max: "STRIPE_PRICE_MAX",
};

/** The configured Stripe Price ID for a paid plan, or null. */
export function priceIdForPlan(plan: PlanId): string | null {
  if (plan === "free") return null;
  return process.env[PLAN_PRICE_ENV[plan]] || null;
}

/** Reverse map: which plan a Stripe Price ID corresponds to. */
export function planForPriceId(priceId: string | undefined | null): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_MAX) return "max";
  return null;
}

export const appBaseUrl = process.env.AUTH_URL || "http://localhost:3000";
